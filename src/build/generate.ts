import path from 'node:path';

import type { CodecPolicies } from '@nogg-aholic/nrpc/codec-generator';
import { generateDocsArtifacts, renderGeneratedDocsArtifactsModule } from '@nogg-aholic/nrpc/docs';
import { generateEndpointSurface } from '@nogg-aholic/nrpc/endpoint-surface-generator';
import type { HttpProtocolMode } from '@nogg-aholic/nrpc/http-route-runtime';
import type { OpenApiMethodDocs } from '@nogg-aholic/nrpc/openapi-types';

export interface GenerateServiceArtifactsOptions {
  entryFile: string;
  rootType: string;
  outFile: string;
  rootPath?: string[];
  basePath?: string;
  globalName?: string;
  declarationTypeName?: string;
  protocolMode?: HttpProtocolMode;
  docs?: Record<string, OpenApiMethodDocs>;
  docsInfo?: {
    title: string;
    version: string;
    description?: string;
  };
  emitGlobalDeclaration?: boolean;
  policies?: CodecPolicies;
}

export const generateServiceArtifacts = async (
  options: GenerateServiceArtifactsOptions,
): Promise<void> => {
  const resolvedEntryFile = path.resolve(options.entryFile);
  const resolvedOutFile = path.resolve(options.outFile);
  const contractOutFile = resolvedOutFile.replace(/\.surface\.ts$/, '.contract.ts');
  const globalsOutFile = resolvedOutFile.replace(/\.surface\.ts$/, '.globals.d.ts');
  const routeManifestOutFile = resolvedOutFile.replace(/\.ts$/, '.http-routes.ts');
  const docsOutFile = resolvedOutFile.replace(/\.surface\.ts$/, '.surface.docs.ts');

  await removeIfExists(resolvedOutFile);
  await removeIfExists(globalsOutFile);
  await removeIfExists(routeManifestOutFile);
  await removeIfExists(docsOutFile);

  const surface = generateEndpointSurface({
    entryFile: resolvedEntryFile,
    rootType: options.rootType,
    outputImportPath: resolvedOutFile,
    rootPath: options.rootPath,
    globalName: options.globalName,
    declarationTypeName: options.declarationTypeName,
    policies: options.policies,
  });

  await Bun.write(contractOutFile, surface.contractText);

  if (options.docsInfo) {
    const docsArtifacts = generateDocsArtifacts({
      entryFile: resolvedEntryFile,
      rootType: options.rootType,
      rootPath: options.rootPath,
      basePath: options.basePath,
      title: options.docsInfo.title,
      version: options.docsInfo.version,
      description: options.docsInfo.description,
      policies: options.policies,
      docs: options.docs,
    });

    await Bun.write(
      docsOutFile,
      renderGeneratedDocsArtifactsModule(docsArtifacts),
    );
  }
};

const removeIfExists = async (filePath: string): Promise<void> => {
  const file = Bun.file(filePath);
  if (await file.exists()) {
    await file.delete();
  }
};
