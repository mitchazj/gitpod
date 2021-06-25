/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import EventEmitter from "events";
import React, { useContext, useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { CreateWorkspaceMode, DisposableCollection, ProjectInfo, Workspace, WorkspaceCreationResult, WorkspaceImageBuild, WorkspaceInstance } from "@gitpod/gitpod-protocol";
import TabMenuItem from "../components/TabMenuItem";
import { getGitpodService } from "../service/service";
import { getCurrentTeam, TeamsContext } from "../teams/teams-context";
import WorkspaceLogs, { watchHeadlessLogs } from "../start/WorkspaceLogs";

const TASKS = {
  NPM: `tasks:
  - init: npm install
    command: npm run start`,
  Yarn: `tasks:
  - init: yarn install
    command: yarn run start`,
  Go: `tasks:
  - init: go get && go build ./... && go test ./...
    command: go run`,
  Rails: `tasks:
  - init: bin/setup
    command: bin/rails server`,
  Rust: `tasks:
  - init: cargo build
    command: cargo watch -x run`,
  Python: `tasks:
  - init: pip install -r requirements.txt
    command: python main.py`,
  Other: `tasks:
  - init: # TODO: install dependencies, build project
    command: # TODO: start app`
}

// const IMAGES = {
//   Default: 'gitpod/workspace-full',
//   '.NET': 'gitpod/workspace-dotnet',
//   MongoDB: 'gitpod/workspace-mongodb',
//   MySQL: 'gitpod/workspace-mysql',
//   PostgreSQL: 'gitpod/workspace-postgres',
//   'Virtual Desktop (VNC)': 'gitpod/workspace-full-vnc',
// }

export default function () {
  const { teams } = useContext(TeamsContext);
  const location = useLocation();
  const team = getCurrentTeam(location, teams);
  const routeMatch = useRouteMatch<{ teamSlug: string, projectSlug: string }>("/:teamSlug/:projectSlug/configure");

  const [ project, setProject ] = useState<ProjectInfo | undefined>();
  const [ workspaceCreationResult, setWorkspaceCreationResult ] = useState<WorkspaceCreationResult | undefined>();
  const [ gitpodYml, setGitpodYml ] = useState<string>('');
  const [ dockerfile, setDockerfile ] = useState<string>('');
  const [ selectedTab, setSelectedTab ] = useState<'.gitpod.yml'|'.gitpod.Dockerfile'>('.gitpod.yml');

  useEffect(() => {
    if (!team) {
      return;
    }
    (async () => {
      const projects = await getGitpodService().server.getProjects(team.id);
      const project = projects.find(p => p.name === routeMatch?.params.projectSlug);
      if (project) {
        setProject(project);
      }
    })();
  }, [ team ]);

  const buildProject = async (event: React.MouseEvent) => {
    if (!project) {
      return;
    }
    (event.target as HTMLButtonElement).disabled = true;
    if (!!workspaceCreationResult) {
      setWorkspaceCreationResult(undefined);
    }
    const config: { '.gitpod.yml': string, '.gitpod.Dockerfile'?: string } = {
      '.gitpod.yml': gitpodYml
    };
    if (!!dockerfile) {
      config['.gitpod.Dockerfile'] = dockerfile;
    }
    await getGitpodService().server.setProjectConfiguration(project.id, gitpodYml);
    // TODO(janx): Start prebuild with above configuration, instead of running a non-prebuilt additionalcontent workspace
    const result = await getGitpodService().server.createWorkspace({
      contextUrl: `prebuild/${project.cloneUrl}`, // `additionalcontent/${btoa(JSON.stringify(config))}/https://github.com/jankeromnes/test`,
      mode: CreateWorkspaceMode.ForceNew,
    });
    setWorkspaceCreationResult(result);
  }

  return <div className="flex flex-col mt-24 mx-auto items-center">
    <h1>Configure Project</h1>
    <p className="text-gray-500 text-center text-base">Fully-automate your project's dev setup. <a className="learn-more" href="https://www.gitpod.io/docs/references/gitpod-yml">Learn more</a></p>
    <div className="mt-4 w-full flex">
      <div className="flex-1 m-8">
        <select className="w-full" defaultValue="" onChange={e => setGitpodYml(e.target.value)}>
          <option value="" disabled={true}>…</option>
          {Object.entries(TASKS).map(([ name, value ]) => <option value={value}>{name}</option>)}
        </select>
        {/* <ConfigBuilder onConfig={(gitpodYml: string, dockerfile: string) => { setGitpodYml(gitpodYml); setDockerfile(dockerfile); }} /> */}
        {!!dockerfile && <div className="flex justify-center border-b border-gray-200 dark:border-gray-800">
          <TabMenuItem name=".gitpod.yml" selected={selectedTab === '.gitpod.yml'} onClick={() => setSelectedTab('.gitpod.yml')} />
          <TabMenuItem name=".gitpod.Dockerfile" selected={selectedTab === '.gitpod.Dockerfile'} onClick={() => setSelectedTab('.gitpod.Dockerfile')} />
        </div>}
        {selectedTab === '.gitpod.yml' &&
          <Editor classes="mt-4 w-full h-72" value={gitpodYml} language="yaml" onChange={setGitpodYml} />}
        {selectedTab === '.gitpod.Dockerfile' &&
          <Editor classes="mt-4 w-full h-72" value={dockerfile} language="dockerfile" onChange={setDockerfile} />}
        <div className="mt-2 flex justify-center space-x-2">
          <button onClick={buildProject}>Test Configuration</button>
        </div>
      </div>
      <div className="flex-1 m-8">
        <h3 className="text-center">Output</h3>
        {!!workspaceCreationResult && <PrebuildLogs workspaceId={workspaceCreationResult.createdWorkspaceId} />}
      </div>
    </div>
  </div>;
}

// function ConfigBuilder(props: { onConfig: (gitpodYml: string, dockerfile: string) => void }) {
//   const [ tasks, setTasks ] = useState<string>('');
//   const [ image, setImage ] = useState<string>('gitpod/workspace-full');
//   const [ isDockerfile, setIsDockerfile ] = useState<boolean>(false);
//   const buildConfig = (event: React.MouseEvent) => {
//       (event.target as HTMLButtonElement).disabled = true;
//       const gitpodYml = (isDockerfile
//           ? 'image:\n  file: .gitpod.Dockerfile\n\n'
//           : (image && image !== 'gitpod/workspace-full'
//             ? `image: ${image}\n\n`
//             : '')) + tasks;
//       const dockerfile = (isDockerfile
//         ? `FROM ${image}\n\n# TODO: Install additional tools`
//         : '');
//       props.onConfig(gitpodYml, dockerfile);
//   };
//   return <div className="h-72 flex flex-col space-y-4">
//     <label>
//       <h4>Project Type</h4>
//       <select className="w-full" defaultValue="" onChange={e => setTasks(e.target.value)}>
//         <option value="" disabled={true}>…</option>
//         {Object.entries(TASKS).map(([ name, value ]) => <option value={value}>{name}</option>)}
//       </select>
//     </label>
//     <label>
//       <h4>Docker Image</h4>
//       <select className="w-full" onChange={e => setImage(e.target.value)}>
//         {Object.entries(IMAGES).map(([ name, value ]) => <option value={value}>{name}</option>)}
//       </select>
//     </label>
//     <label><input type="checkbox" checked={!!isDockerfile} onChange={e => setIsDockerfile(e.target.checked)} /> Customize Dockerfile?</label>
//     <div className="flex-1" />
//     <div className="mt-2 flex justify-center space-x-2">
//       <button onClick={buildConfig}>Preview Configuration</button>
//     </div>
//   </div>;
// }

function Editor(props: { value: string, language: string, onChange: (value: string) => void, classes: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()
  useEffect(() => {
    if (containerRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: props.value,
        language: props.language,
        minimap: {
          enabled: false,
        },
        renderLineHighlight: 'none',
      });
      editorRef.current.onDidChangeModelContent(() => {
        props.onChange(editorRef.current!.getValue());
      });
    }
    return () => editorRef.current?.dispose();
  }, []);
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== props.value) {
      editorRef.current.setValue(props.value);
    }
  }, [ props.value ]);
  return <div className={props.classes} ref={containerRef} />;
}

function PrebuildLogs(props: { workspaceId?: string }) {
  const history = useHistory();
  const [ workspace, setWorkspace ] = useState<Workspace | undefined>();
  const [ workspaceInstance, setWorkspaceInstance ] = useState<WorkspaceInstance | undefined>();
  const [ error, setError ] = useState<Error | undefined>();
  const logsEmitter = new EventEmitter();
  const service = getGitpodService();

  useEffect(() => {
    const disposables = new DisposableCollection();
    (async () => {
      if (!props.workspaceId) {
        return;
      }
      try {
        const info = await service.server.getWorkspace(props.workspaceId);
        if (info.latestInstance) {
          setWorkspace(info.workspace);
          setWorkspaceInstance(info.latestInstance);
        }
        disposables.push(service.registerClient({
          onInstanceUpdate: setWorkspaceInstance,
          onWorkspaceImageBuildLogs: (info: WorkspaceImageBuild.StateInfo, content?: WorkspaceImageBuild.LogContent) => {
            if (!content) {
              return;
            }
            logsEmitter.emit('logs', content.text);
          },
        }));
        if (info.latestInstance) {
          disposables.push(watchHeadlessLogs(service.server, info.latestInstance.id, chunk => {
            logsEmitter.emit('logs', chunk);
          }, () => {}));
        }
      } catch (err) {
        console.error(err);
        setError(err);
      }
    })();
    return function cleanUp() {
      disposables.dispose();
    }
  }, [ props.workspaceId ]);

  useEffect(() => {
    switch (workspaceInstance?.status.phase) {
      // unknown indicates an issue within the system in that it cannot determine the actual phase of
      // a workspace. This phase is usually accompanied by an error.
      case "unknown":
        break;

        // Preparing means that we haven't actually started the workspace instance just yet, but rather
        // are still preparing for launch. This means we're building the Docker image for the workspace.
        case "preparing":
          // return <ImageBuildView workspaceId={this.state.workspaceInstance.workspaceId} />;
          service.server.watchWorkspaceImageBuildLogs(workspace!.id);
          break;

        // Pending means the workspace does not yet consume resources in the cluster, but rather is looking for
        // some space within the cluster. If for example the cluster needs to scale up to accomodate the
        // workspace, the workspace will be in Pending state until that happened.
        case "pending":
          // setPhase(StartPhase.Preparing);
          // statusMessage = <p className="text-base text-gray-400">Allocating resources …</p>;
          break;

        // Creating means the workspace is currently being created. That includes downloading the images required
        // to run the workspace over the network. The time spent in this phase varies widely and depends on the current
        // network speed, image size and cache states.
        case "creating":
          // setPhase(StartPhase.Creating);
          // statusMessage = <p className="text-base text-gray-400">Pulling container image …</p>;
          break;

        // Initializing is the phase in which the workspace is executing the appropriate workspace initializer (e.g. Git
        // clone or backup download). After this phase one can expect the workspace to either be Running or Failed.
        case "initializing":
          // setPhase(StartPhase.Starting);
          // statusMessage = <p className="text-base text-gray-400">{isPrebuilt ? 'Loading prebuild …' : 'Initializing content …'}</p>;
          break;

        // Running means the workspace is able to actively perform work, either by serving a user through Theia,
        // or as a headless workspace.
        case "running":
          // if (isHeadless) {
          //   return <HeadlessWorkspaceView instanceId={this.state.workspaceInstance.id} />;
          // }
          // setPhase(StartPhase.Running);
          // statusMessage = <p className="text-base text-gray-400">Opening IDE …</p>;
          break;

        // Interrupted is an exceptional state where the container should be running but is temporarily unavailable.
        // When in this state, we expect it to become running or stopping anytime soon.
        case "interrupted":
          // setPhase(StartPhase.Running);
          // statusMessage = <p className="text-base text-gray-400">Checking workspace …</p>;
          break;

        // Stopping means that the workspace is currently shutting down. It could go to stopped every moment.
        case "stopping":
          // if (isHeadless) {
          //   return <HeadlessWorkspaceView instanceId={this.state.workspaceInstance.id} />;
          // }
          // setPhase(StartPhase.Stopping);
          // statusMessage = <div>
          //   <div className="flex space-x-3 items-center text-left rounded-xl m-auto px-4 h-16 w-72 mt-4 bg-gray-100 dark:bg-gray-800">
          //     <div className="rounded-full w-3 h-3 text-sm bg-gitpod-kumquat">&nbsp;</div>
          //     <div>
          //       <p className="text-gray-700 dark:text-gray-200 font-semibold">{this.state.workspaceInstance.workspaceId}</p>
          //       <a target="_parent" href={this.state.workspace?.contextURL}><p className="w-56 truncate hover:text-blue-600 dark:hover:text-blue-400" >{this.state.workspace?.contextURL}</p></a>
          //     </div>
          //   </div>
          //   <div className="mt-10 flex justify-center">
          //     <a target="_parent" href={gitpodHostUrl.asDashboard().toString()}><button className="secondary">Go to Dashboard</button></a>
          //   </div>
          // </div>;
          break;

        // Stopped means the workspace ended regularly because it was shut down.
        case "stopped":
          // setPhase(StartPhase.Stopped);
          // if (this.state.hasImageBuildLogs) {
          //   const restartWithDefaultImage = (event: React.MouseEvent) => {
          //     (event.target as HTMLButtonElement).disabled = true;
          //     this.startWorkspace(true, true);
          //   }
          //   return <ImageBuildView workspaceId={this.state.workspaceInstance.workspaceId} onStartWithDefaultImage={restartWithDefaultImage} phase={phase} error={error} />;
          service.server.watchWorkspaceImageBuildLogs(workspace!.id);
          // }
          // if (!isHeadless && this.state.workspaceInstance.status.conditions.timeout) {
          //   title = 'Timed Out';
          // }
          // statusMessage = <div>
          //   <div className="flex space-x-3 items-center text-left rounded-xl m-auto px-4 h-16 w-72 mt-4 mb-2 bg-gray-100 dark:bg-gray-800">
          //     <div className="rounded-full w-3 h-3 text-sm bg-gray-300">&nbsp;</div>
          //     <div>
          //       <p className="text-gray-700 dark:text-gray-200 font-semibold">{this.state.workspaceInstance.workspaceId}</p>
          //       <a target="_parent" href={this.state.workspace?.contextURL}><p className="w-56 truncate hover:text-blue-600 dark:hover:text-blue-400" >{this.state.workspace?.contextURL}</p></a>
          //     </div>
          //   </div>
          //   <PendingChangesDropdown workspaceInstance={this.state.workspaceInstance} />
          //   <div className="mt-10 justify-center flex space-x-2">
          //     <a target="_parent" href={gitpodHostUrl.asDashboard().toString()}><button className="secondary">Go to Dashboard</button></a>
          //     <a target="_parent" href={gitpodHostUrl.asStart(this.state.workspaceInstance?.workspaceId).toString()}><button>Open Workspace</button></a>
          //   </div>
          // </div>;
          break;
    }
    if (workspaceInstance?.status.conditions.failed) {
      setError(new Error(workspaceInstance.status.conditions.failed));
    }
  }, [ workspaceInstance?.status.phase ]);

  return <>
    <div className="capitalize">{workspaceInstance?.status.phase}</div>
    <WorkspaceLogs classes="h-64 w-full" logsEmitter={logsEmitter} errorMessage={error?.message} />
    {/* <pre className="overflow-x-scroll">{JSON.stringify(error, null, 2)}</pre>
    <pre className="overflow-x-scroll">{JSON.stringify(workspace, null, 2)}</pre>
    <pre className="overflow-x-scroll">{JSON.stringify(workspaceInstance, null, 2)}</pre> */}
    <div className="mt-2 flex justify-center space-x-2">
      {workspaceInstance?.status.phase === 'stopped'
        ? <button onClick={() => workspace?.contextURL && history.push('/#' + workspace.contextURL.replace(/^prebuild/, ''))}>Open Workspace</button>
        : <button className="secondary disabled" disabled={true}>Open Workspace</button> }
    </div>
  </>;
}
