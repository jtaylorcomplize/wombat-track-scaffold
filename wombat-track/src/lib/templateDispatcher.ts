// Template dispatcher stub for dashboard compatibility

export const triggerTemplate = async (templateId: string, templateName: string) => {
  // Mock implementation - return success
  return {
    success: true,
    executionId: `exec-${Date.now()}`,
    message: 'Template triggered successfully'
  };
};