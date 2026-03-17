/**
 * OpenCode Gotify Notification Plugin
 *
 * This plugin sends notifications to Gotify when Opencode session events occur.
 *
 * Requirements:
 * - Environment variables: GOTIFY_URL (e.g., https://gotify.example.com), GOTIFY_TOKEN
 * - Works in TUI, CLI, and Web modes
 *
 * Security Note:
 * - TLS verification is disabled for self-signed certificates
 * - Safe for LAN/internal Gotify servers
 */

import type { Plugin } from "@opencode-ai/plugin";

const IDLE_COMPLETE_DELAY_MS = 350;
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

interface SessionState {
  lastNotifiedIdle: number;
  lastNotifiedError: number;
  lastNotifiedQuestion: number;
  errorSuppressionUntil: number;
  idleSequence: number;
}

interface SessionInfo {
  title: string | null;
  lastAccessed: number;
}

const sessionStates = new Map<string, SessionState>();
const sessionInfoCache = new Map<string, SessionInfo>();
const pendingIdleTimers = new Map<string, ReturnType<typeof setTimeout>>();

setInterval(
  () => {
    const cutoff = Date.now() - SESSION_CACHE_TTL_MS;

    for (const [sessionID, state] of sessionStates.entries()) {
      if (
        state.lastNotifiedIdle < cutoff &&
        state.lastNotifiedError < cutoff &&
        state.lastNotifiedQuestion < cutoff &&
        state.errorSuppressionUntil < cutoff
      ) {
        sessionStates.delete(sessionID);
      }
    }

    for (const [sessionID, info] of sessionInfoCache.entries()) {
      if (info.lastAccessed < cutoff) {
        sessionInfoCache.delete(sessionID);
      }
    }
  },
  5 * 60 * 1000,
);

export const GotifyNotify: Plugin = async ({ client, directory, worktree }) => {
  await client.app.log({
    body: {
      service: "gotify-notify",
      level: "info",
      message: "Plugin loaded",
      extra: {
        directory: directory,
        worktree: worktree,
      },
    },
  });

  const getConfig = () => {
    const GOTIFY_URL = process.env.GOTIFY_URL;
    const GOTIFY_TOKEN = process.env.GOTIFY_TOKEN;

    if (!GOTIFY_URL || !GOTIFY_TOKEN) {
      return null;
    }

    return {
      url: GOTIFY_URL.replace(/\/$/, ""),
      token: GOTIFY_TOKEN,
    };
  };

  const sendToGotify = async (title: string, message: string, priority = 5) => {
    const config = getConfig();

    if (!config) {
      await client.app.log({
        body: {
          service: "gotify-notify",
          level: "warn",
          message: "Configuration missing. Set GOTIFY_URL and GOTIFY_TOKEN environment variables.",
        },
      });
      return false;
    }

    const url = `${config.url}/message`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gotify-Key": config.token,
        },
        body: JSON.stringify({
          title: title,
          message: message,
          priority: priority,
        }),
        tls: {
          rejectUnauthorized: false,
        },
      } as RequestInit & { tls: { rejectUnauthorized: boolean } });

      if (!response.ok) {
        const errorText = await response.text();
        await client.app.log({
          body: {
            service: "gotify-notify",
            level: "error",
            message: `Gotify API returned ${response.status}`,
            extra: {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            },
          },
        });
        return false;
      }

      const responseData = await response.json().catch(() => ({}));

      await client.app.log({
        body: {
          service: "gotify-notify",
          level: "info",
          message: `Notification sent successfully`,
          extra: {
            title,
            responseId: responseData.id || "unknown",
          },
        },
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as Record<string, unknown>)?.code || "UNKNOWN";

      await client.app.log({
        body: {
          service: "gotify-notify",
          level: "error",
          message: `Failed to send notification: ${errorMessage}`,
          extra: {
            errorCode,
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });
      return false;
    }
  };

  const getSessionID = (event: Record<string, unknown>): string | null => {
    const sessionID = (event?.properties as Record<string, unknown>)?.sessionID;
    if (typeof sessionID === "string" && sessionID.length > 0) {
      return sessionID;
    }
    return null;
  };

  const getSessionState = (sessionID: string): SessionState => {
    let state = sessionStates.get(sessionID);
    if (!state) {
      state = {
        lastNotifiedIdle: 0,
        lastNotifiedError: 0,
        lastNotifiedQuestion: 0,
        errorSuppressionUntil: 0,
        idleSequence: 0,
      };
      sessionStates.set(sessionID, state);
    }
    return state;
  };

  const isAutoGeneratedTitle = (title: string | null): boolean => {
    if (!title) return true;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(title);
  };

  const getSessionInfo = async (sessionID: string): Promise<SessionInfo> => {
    const cached = sessionInfoCache.get(sessionID);
    if (cached && Date.now() - cached.lastAccessed < SESSION_CACHE_TTL_MS) {
      return cached;
    }

    try {
      const response = await client.session.get({ path: { id: sessionID } });
      const info: SessionInfo = {
        title: response.data?.title ?? null,
        lastAccessed: Date.now(),
      };

      sessionInfoCache.set(sessionID, info);
      return info;
    } catch {
      const info: SessionInfo = {
        title: null,
        lastAccessed: Date.now(),
      };

      sessionInfoCache.set(sessionID, info);
      return info;
    }
  };

  const formatSessionDisplay = (sessionID: string, sessionInfo: SessionInfo): string => {
    if (sessionInfo.title) {
      return `${sessionInfo.title} (${sessionID})`;
    }
    return sessionID;
  };

  const clearPendingIdleTimer = (sessionID: string): void => {
    const timer = pendingIdleTimers.get(sessionID);
    if (timer) {
      clearTimeout(timer);
      pendingIdleTimers.delete(sessionID);
    }
  };

  const bumpSessionIdleSequence = (sessionID: string): number => {
    const state = getSessionState(sessionID);
    state.idleSequence++;
    sessionStates.set(sessionID, state);
    return state.idleSequence;
  };

  const hasCurrentIdleSequence = (sessionID: string, sequence: number): boolean => {
    const state = sessionStates.get(sessionID);
    return state?.idleSequence === sequence;
  };

  const markSessionError = (sessionID: string | null): void => {
    if (!sessionID) return;
    const state = getSessionState(sessionID);
    state.errorSuppressionUntil = Date.now() + 2000;
    state.idleSequence++;
    sessionStates.set(sessionID, state);
    clearPendingIdleTimer(sessionID);
  };

  const shouldSuppressIdle = (sessionID: string): boolean => {
    const state = sessionStates.get(sessionID);
    if (!state) return false;
    if (state.errorSuppressionUntil > Date.now()) {
      return true;
    }
    if (state.errorSuppressionUntil > 0 && state.errorSuppressionUntil < Date.now()) {
      state.errorSuppressionUntil = 0;
      sessionStates.set(sessionID, state);
    }
    return false;
  };

  const serializeError = (error: unknown): string => {
    if (typeof error === "string") {
      return error;
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    if (
      error &&
      typeof error === "object" &&
      "toString" in error &&
      typeof error.toString === "function" &&
      error.toString !== Object.prototype.toString
    ) {
      return error.toString();
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  };

  const processSessionIdle = async (sessionID: string, sequence: number) => {
    if (!hasCurrentIdleSequence(sessionID, sequence)) {
      return;
    }

    if (shouldSuppressIdle(sessionID)) {
      await client.app.log({
        body: {
          service: "gotify-notify",
          level: "debug",
          message: `Suppressing idle notification for session ${sessionID} due to recent error`,
        },
      });
      return;
    }

    const state = getSessionState(sessionID);
    const now = Date.now();

    if (now - state.lastNotifiedIdle < 30000) {
      return;
    }

    state.lastNotifiedIdle = now;
    sessionStates.set(sessionID, state);

    const sessionInfo = await getSessionInfo(sessionID);
    const sessionDisplay = formatSessionDisplay(sessionID, sessionInfo);

    await sendToGotify(
      "\u2705 Task Complete",
      `Opencode session completed successfully\n\nSession: ${sessionDisplay}`,
      5,
    );
  };

  const scheduleSessionIdle = (sessionID: string) => {
    clearPendingIdleTimer(sessionID);
    const sequence = bumpSessionIdleSequence(sessionID);

    const timer = setTimeout(() => {
      pendingIdleTimers.delete(sessionID);
      void processSessionIdle(sessionID, sequence);
    }, IDLE_COMPLETE_DELAY_MS);

    pendingIdleTimers.set(sessionID, timer);
  };

  return {
    event: async ({ event }) => {
      const config = getConfig();

      if (!config) {
        return;
      }

      // Handle permission.asked event (not in v1 SDK types but emitted by Opencode v1.2.27+)
      const eventType = (event as Record<string, unknown>).type as string;
      if (eventType === "permission.asked") {
        const eventProps = (event as Record<string, unknown>).properties as
          | Record<string, unknown>
          | undefined;
        const sessionID = eventProps?.sessionID as string | undefined;
        if (sessionID) {
          const permissionType = (eventProps?.permission as string) || "unknown";
          const patterns = (eventProps?.patterns as string[]) || [];

          const state = getSessionState(sessionID);
          const now = Date.now();

          if (now - state.lastNotifiedQuestion >= 10000) {
            state.lastNotifiedQuestion = now;
            sessionStates.set(sessionID, state);

            const sessionInfo = await getSessionInfo(sessionID);
            const sessionDisplay = formatSessionDisplay(sessionID, sessionInfo);

            const patternsStr = patterns.length > 0 ? `\n\nPatterns: ${patterns.join(", ")}` : "";

            const message = `Permission required: ${permissionType}${patternsStr}\n\nSession: ${sessionDisplay}`;

            await sendToGotify("\u26A0\uFE0F Permission Required", message, 7);
          }
        }
        return;
      }

      switch (event.type) {
        case "session.idle": {
          const sessionID = getSessionID(event as Record<string, unknown>);
          if (sessionID) {
            const cached = sessionInfoCache.get(sessionID);
            if (cached && isAutoGeneratedTitle(cached.title)) {
              sessionInfoCache.delete(sessionID);
              await client.app.log({
                body: {
                  service: "gotify-notify",
                  level: "debug",
                  message: `Invalidated auto-generated title for session ${sessionID}`,
                },
              });
            }
            scheduleSessionIdle(sessionID);
          }
          break;
        }

        case "session.error": {
          const eventProps = (event as Record<string, unknown>).properties as
            | Record<string, unknown>
            | undefined;
          const sessionID = getSessionID(event as Record<string, unknown>);
          const error = eventProps?.error;
          const errorName =
            error && typeof error === "object" && "name" in error ? error.name : undefined;
          const isUserCancelled = errorName === "MessageAbortedError";

          markSessionError(sessionID);

          if (!sessionID) break;

          const state = getSessionState(sessionID);
          const now = Date.now();

          if (now - state.lastNotifiedError < 30000) {
            break;
          }

          state.lastNotifiedError = now;
          sessionStates.set(sessionID, state);

          const errorMessage = serializeError(error);
          const sessionInfo = await getSessionInfo(sessionID);
          const sessionDisplay = formatSessionDisplay(sessionID, sessionInfo);

          if (isUserCancelled) {
            await sendToGotify(
              "\u274C Session Cancelled",
              `Session was cancelled by user\n\nSession: ${sessionDisplay}`,
              6,
            );
          } else {
            await sendToGotify(
              "\u274C Error",
              `Session encountered an error\n\n${errorMessage}\n\nSession: ${sessionDisplay}`,
              8,
            );
          }
          break;
        }

        case "session.created": {
          const sessionID = getSessionID(event as Record<string, unknown>);
          if (sessionID) {
            getSessionState(sessionID);
          }
          break;
        }

        case "session.status": {
          const eventProps = (event as Record<string, unknown>).properties as
            | Record<string, unknown>
            | undefined;
          const status = eventProps?.status as Record<string, unknown> | undefined;
          if (status?.type === "busy") {
            const sessionID = getSessionID(event as Record<string, unknown>);
            if (sessionID) {
              const state = getSessionState(sessionID);
              state.errorSuppressionUntil = 0;
              sessionStates.set(sessionID, state);
            }
          }
          break;
        }

        case "session.updated": {
          const eventProps = (event as Record<string, unknown>).properties as
            | Record<string, unknown>
            | undefined;
          const sessionID = eventProps?.info as Record<string, unknown> | undefined;
          const newTitle =
            sessionID && "title" in sessionID ? (sessionID.title as string) : undefined;
          const sessionIdValue =
            sessionID && "id" in sessionID ? (sessionID.id as string) : undefined;

          if (sessionIdValue && newTitle) {
            sessionInfoCache.set(sessionIdValue, {
              title: newTitle,
              lastAccessed: Date.now(),
            });
            await client.app.log({
              body: {
                service: "gotify-notify",
                level: "debug",
                message: `Updated session title from event: ${newTitle}`,
                extra: {
                  sessionID: sessionIdValue,
                },
              },
            });
          }
          break;
        }
      }
    },

    "tool.execute.before": async (input) => {
      if (input.tool === "question") {
        const config = getConfig();
        if (!config) return;

        const inputRecord = input as Record<string, unknown>;
        const sessionID = inputRecord?.sessionID as string | undefined;
        if (!sessionID) return;

        const state = getSessionState(sessionID);
        const now = Date.now();

        if (now - state.lastNotifiedQuestion < 30000) {
          return;
        }

        state.lastNotifiedQuestion = now;
        sessionStates.set(sessionID, state);

        const sessionInfo = await getSessionInfo(sessionID);
        const sessionDisplay = formatSessionDisplay(sessionID, sessionInfo);

        const questionText = (inputRecord?.text as string) || "";
        const message = questionText
          ? `Agent needs your input\n\n${questionText}\n\nSession: ${sessionDisplay}`
          : `Agent needs your input\n\nSession: ${sessionDisplay}`;

        await sendToGotify("\u2753 Question", message, 7);
      }
    },
  };
};

export default GotifyNotify;
