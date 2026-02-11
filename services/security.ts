
/**
 * Simulación de lógica de seguridad de Backend.
 * En una app real, el hashing sucede en el servidor (Node.js) usando bcrypt.
 * Aquí usamos SHA-256 nativo del navegador para demostrar el concepto.
 */
export const SecurityService = {
  /**
   * Genera un hash único para una contraseña.
   */
  hashPassword: async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Compara una contraseña en texto plano con un hash guardado.
   */
  comparePasswords: async (plain: string, hashed: string): Promise<boolean> => {
    const plainHashed = await SecurityService.hashPassword(plain);
    return plainHashed === hashed;
  }
};
