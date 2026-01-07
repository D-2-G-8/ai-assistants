import type { DocType, AssistantAction } from "@/platform/storage/types";
import type { AssistantProfile } from "@/platform/assistant-runtime/types";
import { assistantProfiles } from "@/platform/assistant-runtime/profiles";

const profileById = new Map<string, AssistantProfile>(
  assistantProfiles.map((profile) => [profile.id, profile])
);

const modeMatrix = new Map<string, string>();

assistantProfiles.forEach((profile) => {
  profile.docTypes.forEach((docType) => {
    profile.actions.forEach((action) => {
      modeMatrix.set(`${docType}:${action}`, profile.id);
    });
  });
});

export const getAssistantProfile = (id: string) => profileById.get(id) || null;

export const resolveAssistantProfile = (params: {
  docType: DocType;
  action: AssistantAction;
  assistantProfileId?: string;
}) => {
  if (params.assistantProfileId) {
    return getAssistantProfile(params.assistantProfileId);
  }
  const key = `${params.docType}:${params.action}`;
  const profileId = modeMatrix.get(key);
  return profileId ? getAssistantProfile(profileId) : null;
};

export const listAssistantProfiles = () => assistantProfiles;

export const listAssistantProfilesByDocType = (docType: DocType) =>
  assistantProfiles.filter((profile) => profile.docTypes.includes(docType));
