import React, { useState } from 'react';
import { Key, Eye, EyeOff, Check, X, Search, Lock, Edit2, RefreshCw, Layers, Trash2 } from 'lucide-react';
import { useStore } from '../store';

interface Team {
  id: string;
  nameAr: string;
  emojis: string;
  color: string;
  code: string;
  parentId?: string | null;
}

interface SettingsPanelProps {
  teams: Record<string, Team>;
  adminUserType: 'super' | 'team';
  loggedInTeamId: string | null;
  setTeamCode: (teamId: string, code: string, nameAr?: string) => void;
  deleteTeam?: (teamId: string) => void;
  addTeam?: (id: string, nameAr: string, emojis: string, color: string, code: string, parentId?: string | null) => void;
}

export function SettingsPanel({ teams, adminUserType, loggedInTeamId, setTeamCode, deleteTeam, addTeam }: SettingsPanelProps) {
  const adminPin = useStore((state) => state.adminPin);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllPINs, setShowAllPINs] = useState(false);
  const [revealedTeamIds, setRevealedTeamIds] = useState<Record<string, boolean>>({});
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempCode, setTempCode] = useState('');
  const [tempName, setTempName] = useState('');
  const [successTeamId, setSuccessTeamId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add sub-team form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubParent, setNewSubParent] = useState('');
  const [newSubEmojis, setNewSubEmojis] = useState('🧱');
  const [newSubColor, setNewSubColor] = useState('#64748B');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubError, setNewSubError] = useState('');

  const handleAddSubTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubParent || !newSubCode.trim()) {
      setNewSubError('⚠️ Please fill out all required fields.');
      return;
    }
    setNewSubError('');

    // Generate a secure unique ID for the sub team
    const customId = `Sub_${newSubParent}_${Date.now().toString().slice(-4)}`;

    if (addTeam) {
      addTeam(
        customId,
        newSubName.trim(),
        newSubEmojis.trim() || '🧱',
        newSubColor.trim() || '#64748B',
        newSubCode.trim(),
        newSubParent
      );
      // Reset form
      setNewSubName('');
      setNewSubParent('');
      setNewSubEmojis('🧱');
      setNewSubColor('#64748B');
      setNewSubCode('');
      setShowAddForm(false);
    }
  };

  const generateRandomNewSubPin = () => {
    const pin = Math.floor(10000 + Math.random() * 90000).toString();
    setNewSubCode(pin);
  };

  const toggleRevealTeam = (teamId: string) => {
    setRevealedTeamIds(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Filter and group teams
  const allTeamsList = Object.values(teams);
  const parentTeams = allTeamsList.filter(t => !t.parentId);
  const childTeams = allTeamsList.filter(t => t.parentId);

  const startEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setTempCode(team.code);
    setTempName(team.nameAr);
    setSuccessTeamId(null);
  };

  const cancelEdit = () => {
    setEditingTeamId(null);
    setTempCode('');
    setTempName('');
  };

  const saveEdit = (teamId: string) => {
    if (!tempCode.trim() || !tempName.trim()) return;
    setTeamCode(teamId, tempCode.trim(), tempName.trim());
    setEditingTeamId(null);
    setSuccessTeamId(teamId);
    setTimeout(() => {
      setSuccessTeamId(null);
    }, 3000);
  };

  const generateRandomPin = () => {
    const pin = Math.floor(10000 + Math.random() * 90000).toString();
    setTempCode(pin);
  };

  // If user is a single Team Admin, they can only view/edit their own logged-in team code
  if (adminUserType === 'team') {
    const myTeam = loggedInTeamId ? teams[loggedInTeamId] : null;
    if (!myTeam) {
      return (
        <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 font-medium font-sans">No data found for this team.</p>
        </div>
      );
    }

    const isEditing = editingTeamId === myTeam.id;

    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight flex items-center gap-2 font-sans justify-start">
            <span className="font-sans">Access PIN Settings</span>
            <Key size={20} className="text-amber-500" />
          </h2>
          <p className="text-slate-500 text-xs mb-6 font-medium text-left font-sans">
            Modify your sub-team's login PIN or name.
          </p>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm text-white" 
                style={{ backgroundColor: myTeam.color || '#3B82F6' }}
              >
                {myTeam.emojis || '👥'}
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Your Team</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="bg-white border border-indigo-500 px-3 py-1 bg-slate-50 focus:bg-white rounded-lg text-sm text-slate-800 font-sansArabic font-bold max-w-[200px]"
                    placeholder="Team Name"
                  />
                ) : (
                  <h3 className="font-black text-slate-800 text-base font-sansArabic">{myTeam.nameAr}</h3>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-auto">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    title="Generate Random Code"
                    className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <input
                    type={showAllPINs ? 'text' : 'password'}
                    value={tempCode}
                    onChange={e => setTempCode(e.target.value)}
                    className="bg-white border-2 border-indigo-500 px-3 py-2 rounded-lg text-sm w-28 font-mono text-center focus:outline-none"
                    maxLength={10}
                    placeholder="New PIN"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(myTeam.id)}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 font-mono text-sm tracking-widest text-slate-700 font-bold min-w-[70px] text-center">
                    {showAllPINs ? myTeam.code : '•••••'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllPINs(!showAllPINs)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition"
                  >
                    {showAllPINs ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(myTeam)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {successTeamId === myTeam.id && (
            <p className="text-emerald-600 text-xs text-center mt-3 font-semibold font-sans">
              ✔ PIN Code and Name updated successfully in database!
            </p>
          )}
        </div>
      </div>
    );
  }

  // Super Admin view: Show all parent and sub-teams with searching and grouping
  const filteredParents = parentTeams.filter(t => 
    t.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.includes(searchTerm)
  );

  const filteredChildren = childTeams.filter(t => 
    t.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      
      {/* Settings Panel Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight flex items-center gap-2 font-sans justify-start">
              <Key size={20} className="text-indigo-500" />
              <span>Access PINs Management</span>
            </h2>
            <p className="text-slate-500 text-xs font-medium font-sans text-left">
              Manage and view PIN codes for all sub-teams and sectors.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAllPINs(!showAllPINs)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition self-end md:self-auto"
          >
            {showAllPINs ? (
              <>
                <EyeOff size={14} />
                <span>Mask All PINs</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Reveal All PINs</span>
              </>
            )}
          </button>
        </div>

        {/* Global Search and Control Row */}
        <div className="relative mb-6">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search teams by name, ID or PIN code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition"
          />
        </div>

        {/* Super Admin Static Alert Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Lock size={16} />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Super Admin Pin Code</h4>
            <p className="text-xs text-amber-700 font-medium font-sans leading-relaxed">
              You can use pin <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-black text-amber-900">{adminPin}</span> to login as Super Admin with full global edit privileges.
            </p>
          </div>
        </div>

        {/* 1. Parent Teams Section */}
        <div className="space-y-4 mb-10">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Layers size={14} className="text-slate-400" />
            <span>Sectors & Divisions</span>
          </h3>
          
          {filteredParents.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No parent groups match search criteria.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParents.map(parent => {
                const isEditing = editingTeamId === parent.id;
                
                return (
                  <div key={parent.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-xs text-white shrink-0" 
                        style={{ backgroundColor: parent.color || '#4F46E5' }}
                      >
                        {parent.emojis}
                      </div>
                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            className="bg-white border border-indigo-500 px-2 py-0.5 rounded text-xs text-slate-800 font-sansArabic font-bold max-w-[150px] focus:outline-none focus:bg-white"
                            placeholder="Name"
                          />
                        ) : (
                          <h4 className="font-bold text-slate-800 text-sm truncate font-sansArabic">{parent.nameAr}</h4>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5 uppercase">ID: {parent.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            type={showAllPINs ? 'text' : 'password'}
                            value={tempCode}
                            onChange={e => setTempCode(e.target.value)}
                            className="bg-white border border-indigo-500 px-2 py-1.5 rounded-md text-xs w-20 font-mono text-center focus:outline-none"
                            maxLength={10}
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(parent.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition"
                            title="Save"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-xs font-bold text-slate-700 tracking-wider bg-white border border-slate-200 px-2.5 py-1 rounded">
                            {showAllPINs || revealedTeamIds[parent.id] ? parent.code : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealTeam(parent.id)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition cursor-pointer"
                            title="Show/Hide PIN"
                          >
                            {showAllPINs || revealedTeamIds[parent.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(parent)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md border border-amber-500 transition cursor-pointer font-bold flex items-center justify-center shadow-xs"
                            title="Edit PIN"
                          >
                            <Edit2 size={13} className="stroke-[2.5]" />
                          </button>
                          {deleteTeam && (
                            deleteConfirmId === parent.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteTeam(parent.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
                                  title="Confirm delete"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(parent.id)}
                                className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded transition cursor-pointer"
                                title="Delete parent team"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Sub-Teams (Children) Section grouped under parent names */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Key size={14} className="text-slate-400" />
            <span>Sub-Teams</span>
          </h3>

          {/* Add Sub-Team Collapsible Card */}
          {adminUserType === 'super' && addTeam && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
                  Quick Add Sub-Group
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer select-none"
                >
                  {showAddForm ? '✕ Close' : '➕ Add Sub-Group'}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddSubTeam} className="p-5 space-y-4 text-left animate-in fade-in slide-in-from-top-3 duration-200 select-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                        Parent Team *
                      </label>
                      <select
                        value={newSubParent}
                        onChange={e => {
                          setNewSubParent(e.target.value);
                          // Auto set matching parent color
                          const p = teams[e.target.value];
                          if (p) setNewSubColor(p.color);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-400 text-xs font-medium"
                        required
                      >
                        <option value="">-- Select Parent Team --</option>
                        {parentTeams.map(p => (
                          <option key={p.id} value={p.id}>{p.emojis} {p.nameAr}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                        Sub-Team Name *
                      </label>
                      <input
                        type="text"
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-400 text-xs font-semibold"
                        placeholder="e.g., Team 7"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                        Custom Emoji
                      </label>
                      <input
                        type="text"
                        value={newSubEmojis}
                        onChange={e => setNewSubEmojis(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-400 text-xs text-center font-bold"
                        placeholder="e.g., 🧱, 🛠️"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                        PIN Code *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubCode}
                          onChange={e => setNewSubCode(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-indigo-400 text-xs font-bold font-mono text-center"
                          placeholder="e.g., 1122"
                          maxLength={10}
                          required
                        />
                        <button
                          type="button"
                          onClick={generateRandomNewSubPin}
                          className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 text-xs font-black transition cursor-pointer flex items-center justify-center font-sans"
                          title="Generate unique pin"
                        >
                          Generate PIN
                        </button>
                      </div>
                    </div>
                  </div>

                  {newSubError && (
                    <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-200/50">
                      {newSubError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                    >
                      Save in Database
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {parentTeams.map(parent => {
            const childrenForParent = filteredChildren.filter(child => child.parentId === parent.id);
            if (childrenForParent.length === 0) return null;

            return (
              <div key={`group-${parent.id}`} className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-600 flex items-center gap-2 font-sansArabic justify-end">
                  <span>{parent.nameAr}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">{parent.emojis}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {childrenForParent.map(child => {
                    const isEditing = editingTeamId === child.id;
                    const isSuccess = successTeamId === child.id;

                    return (
                      <div 
                        key={child.id} 
                        className={`bg-white p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          isSuccess ? 'border-emerald-200 shadow-sm shadow-emerald-50' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-md flex items-center justify-center text-base shadow-xs text-white shrink-0" 
                            style={{ backgroundColor: child.color || '#64748B' }}
                          >
                            {child.emojis}
                          </div>
                          <div className="min-w-0 text-left">
                            {isEditing ? (
                              <input
                                type="text"
                                value={tempName}
                                onChange={e => setTempName(e.target.value)}
                                className="bg-slate-50 border border-indigo-400 px-2 py-0.5 rounded text-xs text-slate-800 font-sansArabic font-bold max-w-[130px] focus:outline-none focus:bg-white"
                                placeholder="Sub-team Name"
                              />
                            ) : (
                              <h5 className="font-bold text-slate-800 text-xs font-sansArabic truncate">{child.nameAr}</h5>
                            )}
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">ID: {child.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={generateRandomPin}
                                title="Generate dynamic 5-digit pin"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded transition"
                              >
                                <RefreshCw size={12} />
                              </button>
                              <input
                                type={showAllPINs ? 'text' : 'password'}
                                value={tempCode}
                                onChange={e => setTempCode(e.target.value)}
                                className="bg-slate-50 border border-indigo-400 px-2 py-1 rounded text-xs w-20 font-mono text-center focus:outline-none focus:bg-white"
                                maxLength={10}
                              />
                              <button
                                type="button"
                                onClick={() => saveEdit(child.id)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-150">
                                {showAllPINs || revealedTeamIds[child.id] ? child.code : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealTeam(child.id)}
                                className="p-1 bg-white hover:bg-slate-50 text-slate-500 rounded border border-slate-200 transition cursor-pointer"
                                title="Show/Hide PIN"
                              >
                                {showAllPINs || revealedTeamIds[child.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(child)}
                                className="p-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded border border-amber-500 transition cursor-pointer font-bold flex items-center justify-center shadow-xs"
                                title="Edit PIN code"
                              >
                                <Edit2 size={12} className="stroke-[2.5]" />
                              </button>
                              {deleteTeam && (
                                deleteConfirmId === child.id ? (
                                  <div className="flex items-center gap-1 ml-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteTeam(child.id);
                                        setDeleteConfirmId(null);
                                      }}
                                      className="px-1.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold transition cursor-pointer"
                                      title="Confirm delete"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(child.id)}
                                    className="p-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded transition cursor-pointer"
                                    title="Delete sub-team"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
