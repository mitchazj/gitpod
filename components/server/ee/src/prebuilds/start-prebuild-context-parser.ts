/**
 * Copyright (c) 2020 Gitpod GmbH. All rights reserved.
 * Licensed under the Gitpod Enterprise Source Code License,
 * See License.enterprise.txt in the project root folder.
 */

import { User, WorkspaceContext, StartPrebuildContext, IssueContext, ContextURL, Project, CommitContext } from "@gitpod/gitpod-protocol";
import { ProjectDB } from '@gitpod/gitpod-db/lib';
import { inject, injectable } from "inversify";
import { IPrefixContextParser } from "../../../src/workspace/context-parser";

@injectable()
export class StartPrebuildContextParser implements IPrefixContextParser {
    @inject(ProjectDB) protected readonly projectDB: ProjectDB;
    static PREFIX = ContextURL.PREBUILD_PREFIX + '/';

    findPrefix(user: User, context: string): string | undefined {
        if (context.startsWith(StartPrebuildContextParser.PREFIX)) {
            return StartPrebuildContextParser.PREFIX;
        }
    }

    public async handle(user: User, prefix: string, context: WorkspaceContext): Promise<WorkspaceContext> {
        if (IssueContext.is(context)) {
            throw new Error("cannot start prebuilds on an issue context")
        }

        let project: Project | undefined;
        let branch: string | undefined;
        if (CommitContext.is(context)) {
            project = await this.projectDB.findProjectByCloneUrl(context.repository.cloneUrl);
            // TODO(janx): branch
        }

        const result: StartPrebuildContext = {
            title: `Prebuild of "${context.title}"`,
            actual: context,
            project,
            branch,
        };
        return result;
    }

}