import { exec } from "child_process";

export async function execute(command: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        // TODO change to spawn so that all the output of the command can be logged
        const { stdout, stderr } = await exec(command);
        stdout.on("data", data => resolve(data.toString()));
        stderr.on("data", data => reject(data.toString()));
    });
}
