// const unused = [projectId, stepId, checkpointId, meetingId];
export async function generateStepInstruction(
  _projectId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _stepId: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  return Promise.resolve("AI-generated step instruction placeholder.");
}

export async function summariseRiskForCheckpoint(
  _checkpointId: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  return Promise.resolve("AI-generated risk summary placeholder.");
}

export async function draftGovernanceLog(
  _meetingId: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  return Promise.resolve("AI-generated governance log placeholder.");
}
