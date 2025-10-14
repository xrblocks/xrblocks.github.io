import type * as GoogleGenAITypes from '@google/genai';
import * as THREE from 'three';
import { AI } from '../ai/AI';
import { CoreSound } from '../sound/CoreSound';
import { Agent, AgentLifecycleCallbacks } from './Agent';
import { ToolResult } from './Tool';
/**
 * State information for a live session.
 */
export interface LiveSessionState {
    /** Whether the session is currently active */
    isActive: boolean;
    /** Timestamp when session started */
    startTime?: number;
    /** Timestamp when session ended */
    endTime?: number;
    /** Number of messages received */
    messageCount: number;
    /** Number of tool calls executed */
    toolCallCount: number;
    /** Last error message if any */
    lastError?: string;
}
/**
 * Skybox Agent for generating 360-degree equirectangular backgrounds through conversation.
 *
 * @example Basic usage
 * ```typescript
 * // 1. Enable audio (required for live sessions)
 * await xb.core.sound.enableAudio();
 *
 * // 2. Create agent
 * const agent = new xb.SkyboxAgent(xb.core.ai, xb.core.sound, xb.core.scene);
 *
 * // 3. Start session
 * await agent.startLiveSession({
 *   onopen: () => console.log('Session ready'),
 *   onmessage: (msg) => handleMessage(msg),
 *   onclose: () => console.log('Session closed')
 * });
 *
 * // 4. Clean up when done
 * await agent.stopLiveSession();
 * xb.core.sound.disableAudio();
 * ```
 *
 * @example With lifecycle callbacks
 * ```typescript
 * const agent = new xb.SkyboxAgent(
 *   xb.core.ai,
 *   xb.core.sound,
 *   xb.core.scene,
 *   {
 *     onSessionStart: () => updateUI('active'),
 *     onSessionEnd: () => updateUI('inactive'),
 *     onError: (error) => showError(error)
 *   }
 * );
 * ```
 *
 * @remarks
 * - Audio must be enabled BEFORE starting live session using `xb.core.sound.enableAudio()`
 * - Users are responsible for managing audio lifecycle
 * - Always call `stopLiveSession()` before disabling audio
 * - Session state can be checked using `getSessionState()` and `getLiveSessionState()`
 */
export declare class SkyboxAgent extends Agent {
    private sound;
    private sessionState;
    constructor(ai: AI, sound: CoreSound, scene: THREE.Scene, callbacks?: AgentLifecycleCallbacks);
    /**
     * Starts a live AI session for real-time conversation.
     *
     * @param callbacks - Optional callbacks for session events. Can also be set using ai.setLiveCallbacks()
     * @throws {Error} If AI model is not initialized or live session is not available
     *
     * @remarks
     * Audio must be enabled separately using `xb.core.sound.enableAudio()` before starting the session.
     * This gives users control over when microphone permissions are requested.
     */
    startLiveSession(callbacks?: GoogleGenAITypes.LiveCallbacks): Promise<void>;
    /**
     * Stops the live AI session.
     *
     * @remarks
     * Audio must be disabled separately using `xb.core.sound.disableAudio()` after stopping the session.
     */
    stopLiveSession(): Promise<void>;
    /**
     * Wraps user callbacks to track session state and trigger lifecycle events.
     * @param callbacks - The callbacks to wrap.
     * @returns The wrapped callbacks.
     */
    private wrapCallbacks;
    /**
     * Sends tool execution results back to the AI.
     *
     * @param response - The tool response containing function results
     */
    sendToolResponse(response: GoogleGenAITypes.LiveSendToolResponseParameters): Promise<void>;
    /**
     * Validates that a tool response has the correct format.
     * @param response - The tool response to validate.
     * @returns True if the response is valid, false otherwise.
     */
    private validateToolResponse;
    /**
     * Helper to create a properly formatted tool response from a ToolResult.
     *
     * @param id - The function call ID
     * @param name - The function name
     * @param result - The ToolResult from tool execution
     * @returns A properly formatted FunctionResponse
     */
    static createToolResponse(id: string, name: string, result: ToolResult): GoogleGenAITypes.FunctionResponse;
    /**
     * Gets the current live session state.
     *
     * @returns Read-only session state information
     */
    getLiveSessionState(): Readonly<LiveSessionState>;
    /**
     * Gets the duration of the session in milliseconds.
     *
     * @returns Duration in ms, or null if session hasn't started
     */
    getSessionDuration(): number | null;
}
