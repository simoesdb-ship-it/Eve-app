// Encryption service for Bitcoin-powered location sharing protocol
import crypto from 'crypto';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
}

export class EncryptionService {
  // Generate ECDH key pairs for secure peer-to-peer communication
  generateKeyPair(): { publicKey: string, privateKey: string } {
    const ecdh = crypto.createECDH('secp256k1'); // Same curve as Bitcoin
    ecdh.generateKeys();
    
    return {
      publicKey: ecdh.getPublicKey('hex'),
      privateKey: ecdh.getPrivateKey('hex')
    };
  }

  // Perform Diffie-Hellman key exchange to create shared secret
  computeSharedSecret(privateKey: string, peerPublicKey: string): string {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey, 'hex');
    const sharedSecret = ecdh.computeSecret(peerPublicKey, 'hex', 'hex');
    
    // Hash the shared secret for additional security
    return crypto.createHash('sha256').update(sharedSecret).digest('hex');
  }

  // Encrypt location/path data using AES-256-GCM
  encryptLocationData(data: any, sharedSecret: string): EncryptionResult {
    const jsonData = JSON.stringify(data);
    const key = this.deriveKey(sharedSecret, 'location-encryption');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  // Decrypt location/path data
  decryptLocationData(encryptedData: EncryptionResult, sharedSecret: string): any {
    const key = this.deriveKey(sharedSecret, 'location-encryption');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // Encrypt message content
  encryptMessage(message: string, sharedSecret: string): EncryptionResult {
    const key = this.deriveKey(sharedSecret, 'message-encryption');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  // Decrypt message content
  decryptMessage(encryptedData: EncryptionResult, sharedSecret: string): string {
    const key = this.deriveKey(sharedSecret, 'message-encryption');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Generate message hash for integrity verification (Bitcoin-style)
  generateMessageHash(content: string, timestamp: string): string {
    const dataToHash = `${content}${timestamp}`;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  // Generate public key fingerprint for verification
  generateKeyFingerprint(publicKey: string): string {
    return crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
  }

  // Derive different keys for different purposes from shared secret
  private deriveKey(sharedSecret: string, purpose: string): Buffer {
    const salt = crypto.createHash('sha256').update(`patterns-app-${purpose}`).digest();
    return crypto.pbkdf2Sync(sharedSecret, salt, 10000, 32, 'sha256');
  }

  // Calculate token cost based on data complexity and distance
  calculateLocationShareCost(pathData: any): number {
    const baseLocationCost = 3; // Base cost for sharing current location
    const basePathCost = 10; // Base cost for sharing path history
    
    if (pathData.type === 'current_location') {
      return baseLocationCost;
    }
    
    if (pathData.type === 'path_history') {
      const pointCount = pathData.coordinates?.length || 1;
      const patternCount = pathData.patterns?.length || 0;
      const insightCount = pathData.insights?.length || 0;
      
      // Dynamic pricing based on data richness
      const complexityMultiplier = 1 + (patternCount * 0.5) + (insightCount * 0.3);
      const sizeMultiplier = Math.min(1 + (pointCount / 100), 3); // Cap at 3x for large paths
      
      return Math.ceil(basePathCost * complexityMultiplier * sizeMultiplier);
    }
    
    return baseLocationCost;
  }

  // Validate encryption integrity
  validateEncryption(originalData: any, encryptedResult: EncryptionResult, sharedSecret: string): boolean {
    try {
      const decrypted = this.decryptLocationData(encryptedResult, sharedSecret);
      return JSON.stringify(originalData) === JSON.stringify(decrypted);
    } catch (error) {
      return false;
    }
  }
}

export default new EncryptionService();