import * as THREE from 'three';
import { AI } from '../../ai/AI';
import { Tool, ToolResult } from '../Tool';
/**
 * A tool that generates a 360-degree equirectangular skybox image
 * based on a given prompt using an AI service.
 */
export declare class GenerateSkyboxTool extends Tool {
    private ai;
    private scene;
    constructor(ai: AI, scene: THREE.Scene);
    /**
     * Executes the tool's action.
     * @param args - The prompt to use to generate the skybox.
     * @returns A promise that resolves with a ToolResult containing success/error information.
     */
    execute(args: {
        prompt: string;
    }): Promise<ToolResult<string>>;
}
