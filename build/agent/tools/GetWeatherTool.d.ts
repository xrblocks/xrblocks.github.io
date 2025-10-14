import { Tool, ToolResult } from '../Tool';
export interface GetWeatherArgs {
    latitude: number;
    longitude: number;
}
export interface WeatherData {
    temperature: number;
    weathercode: number;
}
/**
 * A tool that gets the current weather for a specific location.
 */
export declare class GetWeatherTool extends Tool {
    constructor();
    /**
     * Executes the tool's action.
     * @param args - The arguments for the tool.
     * @returns A promise that resolves with a ToolResult containing weather information.
     */
    execute(args: GetWeatherArgs): Promise<ToolResult<WeatherData>>;
}
