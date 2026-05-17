import React, { useEffect, useRef, useState } from 'react';
import SmoothLink from '../components/SmoothLink/SmoothLink';
import './IdentityRegistryPage.css';

type RegistrySummary = {
  total_count: number;
  student_count: number;
  lecturer_count: number;
  claimed_count: number;
  unclaimed_count: number;
};

type UnitRecord = {
  id: number;
  unit_code: string;
  unit_name: string;
  created_at: string;
  updated_at: string;
};

type RegistryEntry = {
  id: number;
  institutional_id: string;
  full_name: string;
  role: string;
  claimed_by_user_id: number | null;
  assigned_units: UnitRecord[];
  created_at: string;
  updated_at: string;
};

type UploadResult = {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_processed: number;
};

type DeleteResult = {
  deleted_identity_id: number;
  deleted_institutional_id: string;
  deleted_user_account: boolean;
  deleted_user_full_name: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const IdentityRegistryPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [summary, setSummary] = useState<RegistrySummary | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [availableUnits, setAvailableUnits] = useState<UnitRecord[]>([]);
  const [uploadRole, setUploadRole] = useState<'student' | 'lecturer'>('student');
  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RegistryEntry | null>(null);
  const [deleteDialogError, setDeleteDialogError] = useState('');
  const [savingUnitsForEntryId, setSavingUnitsForEntryId] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = getToken();
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  const loadRegistryData = async (role: 'student' | 'lecturer') => {
    setLoading(true);
    setError('');

    try {
      const [summaryRes, entriesRes, unitsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/identity-registry/summary`),
        fetchWithAuth(`${API_BASE}/identity-registry/entries?role=${encodeURIComponent(role)}&limit=100`),
        fetchWithAuth(`${API_BASE}/identity-registry/units`),
      ]);

      if (!summaryRes.ok || !entriesRes.ok || !unitsRes.ok) {
        throw new Error('Failed to load the registry data.');
      }

      const summaryData: RegistrySummary = await summaryRes.json();
      const entriesData: RegistryEntry[] = await entriesRes.json();
      const unitsData: UnitRecord[] = await unitsRes.json();

      setSummary(summaryData);
      setEntries(entriesData);
      setAvailableUnits(unitsData);

      if (selectedEntryId !== null) {
        const refreshedEntry = entriesData.find((entry) => entry.id === selectedEntryId) || null;
        if (refreshedEntry) {
          setSelectedUnitIds(refreshedEntry.assigned_units.map((unit) => unit.id));
        } else {
          setSelectedEntryId(null);
          setSelectedUnitIds([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the registry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistryData(selectedRole);
  }, [selectedRole]);

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || null;
  const filteredEntries = entries.filter((entry) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return (
      entry.institutional_id.toLowerCase().includes(normalizedSearch) ||
      entry.full_name.toLowerCase().includes(normalizedSearch)
    );
  });

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedFile) {
      setError('Please choose a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('role', uploadRole);
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Upload failed.');
      }

      const result = payload as UploadResult;
      setMessage(
        `Upload complete for ${uploadRole} IDs. ${result.created_count} created, ${result.updated_count} updated, ${result.skipped_count} skipped.`
      );
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadRegistryData(selectedRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEntryRequest = (entry: RegistryEntry) => {
    setDeleteCandidate(entry);
    setDeleteDialogError('');
    setError('');
    setMessage('');
  };

  const handleCancelDeleteEntry = () => {
    if (deletingEntryId !== null) {
      return;
    }

    setDeleteCandidate(null);
    setDeleteDialogError('');
  };

  const handleConfirmDeleteEntry = async () => {
    if (!deleteCandidate || deletingEntryId !== null) {
      return;
    }

    const entry = deleteCandidate;
    setError('');
    setMessage('');
    setDeleteDialogError('');

    try {
      setDeletingEntryId(entry.id);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/entries/${entry.id}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Delete failed.');
      }

      const result = payload as DeleteResult;
      setMessage(
        result.deleted_user_account
          ? `${result.deleted_user_full_name || entry.full_name} was removed from the registry and their account was deleted.`
          : `${entry.full_name} was removed from the registry.`
      );
      if (selectedEntryId === entry.id) {
        setSelectedEntryId(null);
        setSelectedUnitIds([]);
      }
      setDeleteCandidate(null);
      await loadRegistryData(selectedRole);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed.';
      setDeleteDialogError(errorMessage);
      setError(errorMessage);
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleManageUnits = (entry: RegistryEntry) => {
    setSelectedEntryId(entry.id);
    setSelectedUnitIds(entry.assigned_units.map((unit) => unit.id));
    setError('');
    setMessage('');
  };

  const handleToggleUnit = (unitId: number) => {
    setSelectedUnitIds((currentIds) =>
      currentIds.includes(unitId)
        ? currentIds.filter((currentId) => currentId !== unitId)
        : [...currentIds, unitId]
    );
  };

  const handleSaveUnits = async () => {
    if (!selectedEntry) {
      return;
    }

    setError('');
    setMessage('');

    try {
      setSavingUnitsForEntryId(selectedEntry.id);
      const response = await fetchWithAuth(
        `${API_BASE}/identity-registry/entries/${selectedEntry.id}/assigned-units`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ unit_ids: selectedUnitIds }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Saving units failed.');
      }

      const updatedEntry = payload as RegistryEntry;
      setEntries((currentEntries) =>
        currentEntries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
      );
      setSelectedUnitIds(updatedEntry.assigned_units.map((unit) => unit.id));
      setMessage(`Updated unit access for ${updatedEntry.full_name}.`);
      setSelectedEntryId(null);
      setSelectedUnitIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saving units failed.');
    } finally {
      setSavingUnitsForEntryId(null);
    }
  };

  return (
    <div className="identity-registry-page">
      <section className="identity-registry-hero">
        <div>
          <p className="identity-registry-kicker">Lecturer Settings</p>
          <h1>User Verification Registry</h1>
          <p className="identity-registry-subtitle">
            Upload approved student or lecturer IDs, then assign the units each person should be enrolled into later.
          </p>
        </div>
      </section>

      {summary && (
        <section className="identity-registry-summary">
          <article className="summary-card">
            <span>Total IDs</span>
            <strong>{summary.total_count}</strong>
          </article>
          <article className="summary-card">
            <span>Students</span>
            <strong>{summary.student_count}</strong>
          </article>
          <article className="summary-card">
            <span>Lecturers</span>
            <strong>{summary.lecturer_count}</strong>
          </article>
          <article className="summary-card">
            <span>Claimed</span>
            <strong>{summary.claimed_count}</strong>
          </article>
          <article className="summary-card">
            <span>Available</span>
            <strong>{summary.unclaimed_count}</strong>
          </article>
        </section>
      )}

      <section className="identity-registry-grid">
        <div className="identity-panel">
          <h2>Upload CSV</h2>
          <p className="panel-help">
            CSV format: column 1 = student ID, column 2 = full name. If you still upload a third unit-code column, it will be kept only as legacy data and unit access should now be managed below.
          </p>
          <p className="panel-help">
            Choose the role for this upload here. The table filter on the right is only for browsing and searching registered IDs.
          </p>
          <p className="panel-help identity-warning">
            Deleting a claimed ID from the table also deletes that user account and immediately blocks future logins.
          </p>

          <form onSubmit={handleUpload} className="identity-upload-form">
            <div className="form-group">
              <label htmlFor="registry-upload-role">Upload To</label>
              <select
                id="registry-upload-role"
                value={uploadRole}
                onChange={(e) => setUploadRole(e.target.value as 'student' | 'lecturer')}
                disabled={uploading}
              >
                <option value="student">Student IDs</option>
                <option value="lecturer">Lecturer IDs</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="registry-file">CSV File</label>
              <input
                id="registry-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>

            {selectedFile && <p className="selected-file">Selected: {selectedFile.name}</p>}
            {message && <div className="status-message success">{message}</div>}
            {error && <div className="status-message error">{error}</div>}

            <button type="submit" className="upload-button" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload Registry CSV'}
            </button>
          </form>
        </div>

        <div className="identity-panel">
          <div className="panel-header">
            <h2>Registered IDs</h2>
            <span className="panel-chip">{selectedRole}</span>
          </div>
          <div className="registry-toolbar">
            <div className="registry-toolbar-field">
              <label htmlFor="registry-role-filter">Registry Type</label>
              <select
                id="registry-role-filter"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'student' | 'lecturer')}
              >
                <option value="student">Student IDs</option>
                <option value="lecturer">Lecturer IDs</option>
              </select>
            </div>
            <div className="registry-toolbar-field registry-search-field">
              <label htmlFor="registry-search">Search ID</label>
              <input
                id="registry-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search lecturer/student ID or name"
              />
            </div>
          </div>

          {loading ? (
            <p className="panel-help">Loading registry entries...</p>
          ) : entries.length === 0 ? (
            <p className="panel-help">No IDs uploaded for this role yet.</p>
          ) : filteredEntries.length === 0 ? (
            <p className="panel-help">No registered IDs match that search.</p>
          ) : (
            <div className="registry-table-wrapper">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.institutional_id}</td>
                      <td>{entry.full_name}</td>
                      <td>
                        <div className="unit-pill-list">
                          {entry.assigned_units.length > 0 ? (
                            entry.assigned_units.map((unit) => (
                              <span key={unit.id} className="unit-pill">
                                {unit.unit_code}
                              </span>
                            ))
                          ) : (
                            <span className="empty-inline-text">No units</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${entry.claimed_by_user_id ? 'claimed' : 'available'}`}>
                          {entry.claimed_by_user_id ? 'Claimed' : 'Available'}
                        </span>
                      </td>
                      <td>
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="secondary-action-button"
                            onClick={() => handleManageUnits(entry)}
                          >
                            Manage Units
                          </button>
                          <button
                            type="button"
                            className="delete-entry-button"
                            onClick={() => handleDeleteEntryRequest(entry)}
                            disabled={deletingEntryId === entry.id}
                          >
                            {deletingEntryId === entry.id
                              ? 'Deleting...'
                              : entry.claimed_by_user_id
                                ? 'Delete User'
                                : 'Delete ID'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedEntry && (
            <div className="unit-assignment-panel">
              <div className="unit-assignment-header">
                <h3>Assign Units</h3>
                <span className="panel-chip">{selectedEntry.institutional_id}</span>
              </div>

              {availableUnits.length === 0 ? (
                <p className="panel-help">
                  No units exist yet. Create them in the <SmoothLink to="/vector-database/unit-manager" className="inline-link">Unit Manager</SmoothLink> first.
                </p>
              ) : (
                <>
                  <p className="panel-help">
                    Assign unit access for <strong>{selectedEntry.full_name}</strong>. These units can be used later when the user signs up and logs in.
                  </p>
                  <div className="unit-checkbox-grid">
                    {availableUnits.map((unit) => (
                      <label key={unit.id} className="unit-checkbox-card">
                        <input
                          type="checkbox"
                          checked={selectedUnitIds.includes(unit.id)}
                          onChange={() => handleToggleUnit(unit.id)}
                          disabled={savingUnitsForEntryId === selectedEntry.id}
                        />
                        <div>
                          <strong>{unit.unit_code}</strong>
                          <span>{unit.unit_name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="unit-assignment-actions">
                    <button
                      type="button"
                      className="secondary-action-button"
                      onClick={() => {
                        setSelectedEntryId(null);
                        setSelectedUnitIds([]);
                      }}
                      disabled={savingUnitsForEntryId === selectedEntry.id}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="upload-button"
                      onClick={handleSaveUnits}
                      disabled={savingUnitsForEntryId === selectedEntry.id}
                    >
                      {savingUnitsForEntryId === selectedEntry.id ? 'Saving...' : 'Save Unit Access'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {deleteCandidate && (
        <div
          className="registry-delete-modal-backdrop"
          role="presentation"
          onClick={handleCancelDeleteEntry}
        >
          <div
            className="registry-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registry-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="registry-delete-modal-icon" aria-hidden="true">
              !
            </div>
            <h2 id="registry-delete-title">Delete registered ID?</h2>
            <p>
              Delete <strong>{deleteCandidate.full_name}</strong> ({deleteCandidate.institutional_id}) from the registry?
            </p>
            <p>
              {deleteCandidate.claimed_by_user_id
                ? 'This will also delete their account and they will no longer be able to log in.'
                : 'They will no longer be able to sign up unless this ID is uploaded again.'}
            </p>
            {deleteDialogError && (
              <div className="registry-delete-modal-error">{deleteDialogError}</div>
            )}
            <div className="registry-delete-modal-actions">
              <button
                type="button"
                className="registry-delete-cancel"
                onClick={handleCancelDeleteEntry}
                disabled={deletingEntryId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="registry-delete-confirm"
                onClick={handleConfirmDeleteEntry}
                disabled={deletingEntryId !== null}
                autoFocus
              >
                {deletingEntryId === deleteCandidate.id ? 'Deleting...' : 'Delete ID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityRegistryPage;
