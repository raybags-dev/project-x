import { config } from "dotenv";
import { promises as fs } from "fs";
import * as crypto from "node:crypto";
import path from "path";
config();

async function encryptAllFile(filePath) {
  try {
    const key = loadEncryptionKey("AUTH_ENCRYPTION_KEY");
    const keyBuffer = Buffer.from(key, "hex");
    const fileName = path.basename(filePath);
    console.log(`Processing file for encryption: ${fileName}`);

    if (fileName.endsWith(".enc")) {
      console.log(
        `File "${fileName}" is already encrypted. Skipping encryption...👁️`
      );
      return;
    }

    const encryptedFileName = `${fileName}.enc`;
    const plaintextData = await fs.readFile(filePath);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
    const encryptedData = Buffer.concat([
      iv,
      cipher.update(plaintextData),
      cipher.final(),
    ]);

    const encryptedFilePath = path.join(
      path.dirname(filePath),
      encryptedFileName
    );
    await fs.writeFile(encryptedFilePath, encryptedData);

    await fs.unlink(filePath);
    console.log("File encrypted successfully. ✔✔✔");
  } catch (error) {
    console.error("Error:", error.message);
  }
}
async function decryptAllFile(encryptedFilePath) {
  try {
    const key = loadEncryptionKey("AUTH_ENCRYPTION_KEY");
    const keyBuffer = Buffer.from(key, "hex");
    const fileName = path.basename(encryptedFilePath);
    console.log(`Processing file for decryption: ${fileName}`);

    if (!fileName.endsWith(".enc")) {
      console.log(`File "${fileName}" is already in desired state...👁️`);
      return;
    }

    const decryptedFileName = fileName.replace(".enc", "");
    const encryptedDataWithIV = await fs.readFile(encryptedFilePath);
    const iv = encryptedDataWithIV.slice(0, 16);
    const encryptedData = encryptedDataWithIV.slice(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    const decryptedFilePath = path.join(
      path.dirname(encryptedFilePath),
      decryptedFileName
    );
    await fs.writeFile(decryptedFilePath, decryptedData);

    await fs.unlink(encryptedFilePath);
    console.log("Decryption successful. ✔✔✔");
  } catch (error) {
    console.error("Error:", error.message);
  }
}
function loadEncryptionKey(keyName) {
  if (!keyName) return;
  const key = process.env[keyName];

  if (typeof key === "undefined")
    throw new Error(`Encryption key "${keyName}" is undefined.`);

  if (key === "")
    throw new Error(`Encryption key "${keyName}" is an empty string.`);

  const validKey = key.trim();

  if (!/^[a-f0-9]{64}$/i.test(validKey)) {
    throw new Error(`Encryption key "${keyName}" invalid.`);
  }
  return validKey;
}

async function processAuthFiles(encrypt, folderPaths) {
  try {
    for (const folderPath of folderPaths) {
      const files = await fs.readdir(folderPath);

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (
          encrypt &&
          (file.endsWith(".js") || file.endsWith(".json")) &&
          !file.endsWith(".enc")
        ) {
          await encryptAllFile(filePath);
        } else if (
          !encrypt &&
          (file.endsWith(".js.enc") || file.endsWith(".json.enc"))
        ) {
          await decryptAllFile(filePath);
        } else if (encrypt && file.endsWith(".enc")) {
          console.log(
            `Skipping encryption for <${file}> | file already encrypted.`
          );
        } else if (!encrypt && !file.endsWith(".enc")) {
          console.log(`<${file}> | file already in desired state.`);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error("Processing error:", error.message);
  }
}

export default processAuthFiles;
