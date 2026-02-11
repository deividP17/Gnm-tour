
import { Notification, User } from '../types';

export const EmailService = {
  /**
   * Simula el envío de un correo electrónico
   */
  sendEmail: (to: string, subject: string, body: string) => {
    console.log(`%c[EMAIL SENT TO: ${to}]`, 'color: #3b82f6; font-weight: bold; border: 1px solid #3b82f6; padding: 4px; border-radius: 4px;');
    console.log(`Asunto: ${subject}`);
    console.log(`Cuerpo: ${body}`);
    
    // Disparar un evento global para que el UI pueda mostrar un Toast si es necesario
    const event = new CustomEvent('gnm-email-sent', { 
      detail: { to, subject } 
    });
    window.dispatchEvent(event);
  },

  /**
   * Genera una notificación interna para el usuario
   */
  createNotification: (user: User, type: Notification['type'], title: string, message: string): Notification => {
    const newNotif: Notification = {
      id: `n-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    // En una app real esto se guardaría en la DB. Aquí simulamos el envío de email adjunto.
    EmailService.sendEmail(user.email, title, message);
    
    return newNotif;
  }
};
