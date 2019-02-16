/*
 This is the layer between the external dependancy and the simple git library, 
 this class will simplify some of the callouts that are being perfomred and will turn the callback methods into async
 TODO add comments in a more structured manner to the top of the files
*/
import * as simplegit from "simple-git";
import { promisify } from "util";
import * as fileSystem from "fs";

export default class GitWrapper {
    private repo: any;
    readonly repositoryPath: string;
    public revparse: Function;
    public diff: Function;
    public add: Function;
    public commit: Function;
    public checkout: Function;
    public init: Function;

    constructor(repositoryPath: string) {
        this.repo = simplegit(repositoryPath);
        this.repositoryPath = repositoryPath;
        this.revparse = promisify(this.repo.revparse.bind(this.repo));
        this.diff = promisify(this.repo.diff.bind(this.repo));
        this.add = promisify(this.repo.add.bind(this.repo));
        this.commit = promisify(this.repo.commit.bind(this.repo));
        this.checkout = promisify(this.repo.checkout.bind(this.repo));
        this.init = this.repo.init.bind(this.repo);
    }

    public async getHead(): Promise<string> {
        let headString: string;
        try {
            headString = await this.revparse(["--short", "HEAD"]);
        } catch (error) {
            console.log("Not in a git repository");
            return "";
        }
        return headString.substring(0, headString.lastIndexOf("\n"));
    }

    public isValidRepo(): boolean {
        return this.repositoryPath && fileSystem.existsSync(this.repositoryPath + "/.git");
    }
}
