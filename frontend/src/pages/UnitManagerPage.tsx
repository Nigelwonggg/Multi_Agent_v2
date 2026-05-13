import React, { useEffect, useRef, useState } from 'react';
import './UnitManagerPage.css';

type UnitRecord = {
  id: number;
  unit_code: string;
  unit_name: string;
  created_at: string;
  updated_at: string;
};

type DeleteUnitResult = {
  deleted_unit_id: number;
  deleted_unit_code: string;
};

type UnitUploadResult = {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_processed: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const UnitManagerPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitName, setEditUnitName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);
  const [deletingUnitId, setDeletingUnitId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  const loadUnits = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/units`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || 'Failed to load units.');
      }

      const data: UnitRecord[] = await response.json();
      setUnits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const filteredUnits = units.filter((unit) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return (
      unit.unit_code.toLowerCase().includes(normalizedSearch) ||
      unit.unit_name.toLowerCase().includes(normalizedSearch)
    );
  });

  const handleCreateUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!unitCode.trim() || !unitName.trim()) {
      setError('Both unit code and unit name are required.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit_code: unitCode,
          unit_name: unitName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to create unit.');
      }

      const createdUnit = payload as UnitRecord;
      setUnits((currentUnits) =>
        [...currentUnits, createdUnit].sort((left, right) => left.unit_code.localeCompare(right.unit_code))
      );
      setUnitCode('');
      setUnitName('');
      setMessage(`Created ${createdUnit.unit_code} - ${createdUnit.unit_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unit: UnitRecord) => {
    const confirmed = window.confirm(
      `Delete ${unit.unit_code} - ${unit.unit_name}? This will also remove it from any registered IDs that currently have it assigned.`
    );
    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');

    try {
      setDeletingUnitId(unit.id);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/units/${unit.id}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to delete unit.');
      }

      const result = payload as DeleteUnitResult;
      setUnits((currentUnits) => currentUnits.filter((currentUnit) => currentUnit.id !== unit.id));
      setMessage(`Deleted ${result.deleted_unit_code}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete unit.');
    } finally {
      setDeletingUnitId(null);
    }
  };

  const handleStartEdit = (unit: UnitRecord) => {
    setEditingUnitId(unit.id);
    setEditUnitCode(unit.unit_code);
    setEditUnitName(unit.unit_name);
    setError('');
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingUnitId(null);
    setEditUnitCode('');
    setEditUnitName('');
  };

  const handleUpdateUnit = async (unitId: number) => {
    setError('');
    setMessage('');

    if (!editUnitCode.trim() || !editUnitName.trim()) {
      setError('Both unit code and unit name are required.');
      return;
    }

    try {
      setUpdatingUnitId(unitId);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/units/${unitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit_code: editUnitCode,
          unit_name: editUnitName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to update unit.');
      }

      const updatedUnit = payload as UnitRecord;
      setUnits((currentUnits) =>
        currentUnits
          .map((unit) => (unit.id === updatedUnit.id ? updatedUnit : unit))
          .sort((left, right) => left.unit_code.localeCompare(right.unit_code))
      );
      setMessage(`Updated ${updatedUnit.unit_code} - ${updatedUnit.unit_name}.`);
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update unit.');
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const handleUploadUnits = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedFile) {
      setError('Please choose a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/units/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to upload units.');
      }

      const result = payload as UnitUploadResult;
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMessage(
        `Upload complete. ${result.created_count} created, ${result.updated_count} updated, ${result.skipped_count} skipped.`
      );
      await loadUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload units.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="unit-manager-page">
      <section className="unit-manager-hero">
        <div>
          <p className="unit-manager-kicker">Lecturer Settings</p>
          <h1>Unit Manager</h1>
          <p className="unit-manager-subtitle">
            Create the official unit codes and names here, then assign them to registered IDs from the User Registry tab.
          </p>
        </div>
      </section>

      <section className="unit-manager-grid">
        <div className="unit-panel">
          <h2>Add Unit</h2>
          <p className="panel-help">
            Keep unit definitions centralized here so lecturers assign the same codes consistently across registered users.
          </p>

          <form onSubmit={handleCreateUnit} className="unit-form">
            <div className="form-group">
              <label htmlFor="unit-code">Unit Code</label>
              <input
                id="unit-code"
                type="text"
                value={unitCode}
                onChange={(event) => setUnitCode(event.target.value.toUpperCase())}
                placeholder="e.g. FIT3155"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unit-name">Unit Name</label>
              <input
                id="unit-name"
                type="text"
                value={unitName}
                onChange={(event) => setUnitName(event.target.value)}
                placeholder="e.g. Advanced Algorithms"
                disabled={saving}
              />
            </div>

            {message && <div className="status-message success">{message}</div>}
            {error && <div className="status-message error">{error}</div>}

            <button type="submit" className="unit-submit-button" disabled={saving}>
              {saving ? 'Saving...' : 'Create Unit'}
            </button>
          </form>

          <div className="unit-upload-divider" />

          <h2>Upload CSV</h2>
          <p className="panel-help">
            CSV format: column 1 = unit code, column 2 = unit name. Existing unit codes will be updated with the new name.
          </p>

          <form onSubmit={handleUploadUnits} className="unit-form">
            <div className="form-group">
              <label htmlFor="unit-file">Unit CSV File</label>
              <input
                id="unit-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>

            {selectedFile && <p className="selected-file">Selected: {selectedFile.name}</p>}

            <button type="submit" className="unit-submit-button" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload Unit CSV'}
            </button>
          </form>
        </div>

        <div className="unit-panel">
          <div className="unit-panel-header">
            <h2>Current Units</h2>
            <span className="panel-chip">{units.length} total</span>
          </div>

          <div className="unit-search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by unit code or unit name"
            />
          </div>

          {loading ? (
            <p className="panel-help">Loading units...</p>
          ) : filteredUnits.length === 0 ? (
            <p className="panel-help">No units created yet.</p>
          ) : (
            <div className="unit-table-wrapper">
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td>
                        {editingUnitId === unit.id ? (
                          <input
                            className="unit-inline-input"
                            type="text"
                            value={editUnitCode}
                            onChange={(event) => setEditUnitCode(event.target.value.toUpperCase())}
                            disabled={updatingUnitId === unit.id}
                          />
                        ) : (
                          unit.unit_code
                        )}
                      </td>
                      <td>
                        {editingUnitId === unit.id ? (
                          <input
                            className="unit-inline-input"
                            type="text"
                            value={editUnitName}
                            onChange={(event) => setEditUnitName(event.target.value)}
                            disabled={updatingUnitId === unit.id}
                          />
                        ) : (
                          unit.unit_name
                        )}
                      </td>
                      <td>
                        <div className="unit-action-group">
                          {editingUnitId === unit.id ? (
                            <>
                              <button
                                type="button"
                                className="edit-unit-button"
                                onClick={() => handleUpdateUnit(unit.id)}
                                disabled={updatingUnitId === unit.id}
                              >
                                {updatingUnitId === unit.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="cancel-unit-button"
                                onClick={handleCancelEdit}
                                disabled={updatingUnitId === unit.id}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="edit-unit-button"
                                onClick={() => handleStartEdit(unit)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="delete-unit-button"
                                onClick={() => handleDeleteUnit(unit)}
                                disabled={deletingUnitId === unit.id}
                              >
                                {deletingUnitId === unit.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default UnitManagerPage;
