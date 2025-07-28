import fs from 'fs/promises';
import path from 'path';

export interface AIMessage {
  id: string;
  from: 'Claude' | 'Gizmo';
  to: 'Claude' | 'Gizmo';
  timestamp: string;
  message: string;
  context?: any;
  status: 'pending' | 'read' | 'responded';
  responseId?: string;
}

export class ClaudeGizmoFileComm {
  private commFile = path.join(process.cwd(), '.ai-communication/messages.json');

  async sendMessage(message: Omit<AIMessage, 'id' | 'timestamp' | 'status'>) {
    await this.ensureCommFile();
    
    const messages = await this.getAllMessages();
    const newMessage: AIMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    messages.push(newMessage);
    await fs.writeFile(this.commFile, JSON.stringify(messages, null, 2));
    
    return newMessage;
  }

  async getUnreadMessages(recipient: 'Claude' | 'Gizmo'): Promise<AIMessage[]> {
    const messages = await this.getAllMessages();
    return messages.filter(m => m.to === recipient && m.status === 'pending');
  }

  async markAsRead(messageId: string) {
    const messages = await this.getAllMessages();
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.status = 'read';
      await fs.writeFile(this.commFile, JSON.stringify(messages, null, 2));
    }
  }

  async respondToMessage(originalId: string, response: string) {
    const messages = await this.getAllMessages();
    const original = messages.find(m => m.id === originalId);
    
    if (!original) throw new Error('Original message not found');
    
    const responseMessage: AIMessage = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: original.to,
      to: original.from,
      timestamp: new Date().toISOString(),
      message: response,
      context: { inResponseTo: originalId },
      status: 'pending',
      responseId: originalId
    };
    
    original.status = 'responded';
    messages.push(responseMessage);
    
    await fs.writeFile(this.commFile, JSON.stringify(messages, null, 2));
    return responseMessage;
  }

  private async getAllMessages(): Promise<AIMessage[]> {
    try {
      const content = await fs.readFile(this.commFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async ensureCommFile() {
    const dir = path.dirname(this.commFile);
    await fs.mkdir(dir, { recursive: true });
    
    try {
      await fs.access(this.commFile);
    } catch {
      await fs.writeFile(this.commFile, '[]');
    }
  }
}