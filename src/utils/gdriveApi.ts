/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  createdTime?: string;
}

/**
 * Searches or lists files inside the user's Google Drive.
 */
export async function listDriveFiles(
  token: string,
  searchQuery: string = '',
  mimeTypeFilter: string = ''
): Promise<GDriveFile[]> {
  let query = "trashed = false";
  
  if (searchQuery) {
    // Escape single quotes for safety
    const safeSearch = searchQuery.replace(/'/g, "\\'");
    query += ` and name contains '${safeSearch}'`;
  }
  
  if (mimeTypeFilter) {
    query += ` and mimeType = '${mimeTypeFilter}'`;
  } else {
    // Default: avoid folders unless specifically requested, so users select documents
    query += ` and mimeType != 'application/vnd.google-apps.folder'`;
  }

  const fields = 'files(id, name, mimeType, size, webViewLink, createdTime)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorDetails = await res.text();
    throw new Error(`Drive list API failed: ${res.statusText}. Details: ${errorDetails}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Looks for an existing config/backup file in Google Drive.
 */
export async function findDriveBackupFile(token: string, filename: string): Promise<string | null> {
  const query = `name = '${filename}' and trashed = false and mimeType = 'application/json'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to query backup presence: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Saves or updates a backup JSON file in Google Drive using the robust 2-step flow.
 */
export async function saveBackupToDrive(token: string, filename: string, contentStr: string): Promise<string> {
  // 1. Check if backup file already exists
  const existingId = await findDriveBackupFile(token, filename);
  
  if (existingId) {
    // Update existing file content
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: contentStr,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to update backup file content: ${uploadRes.statusText}`);
    }

    return existingId;
  } else {
    // Create new file metadata
    const metaUrl = 'https://www.googleapis.com/drive/v3/files';
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: filename,
        mimeType: 'application/json',
      }),
    });

    if (!metaRes.ok) {
      throw new Error(`Failed to create backup metadata: ${metaRes.statusText}`);
    }

    const fileMeta = await metaRes.json();
    const newId = fileMeta.id;

    // Upload content to the newly created file ID
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: contentStr,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload content for backup: ${uploadRes.statusText}`);
    }

    return newId;
  }
}

/**
 * Downloads a text-based file (like JSON backup) from Google Drive.
 */
export async function downloadDriveFile(token: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file: ${res.statusText}`);
  }

  return await res.text();
}
