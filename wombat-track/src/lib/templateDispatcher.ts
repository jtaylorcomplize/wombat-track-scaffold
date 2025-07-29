// Template dispatcher stub for dashboard compatibility

export const triggerTemplate = async (
  _templateId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _templateName: string // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  // Mock implementation - return success
  return {
    success: true,
    executionId: `exec-${Date.now()}`,
    message: 'Template triggered successfully'
  };
};