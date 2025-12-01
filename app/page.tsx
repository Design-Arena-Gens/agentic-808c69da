'use client';

import { useState, useMemo, useEffect } from 'react';
import { clients, allPrograms, allTargets, dataPoints } from '@/lib/mockData';
import type { Client, Program, Target, DataPoint } from '@/lib/mockData';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Target as TargetIcon, Users, Calendar,
  Search, X, ChevronDown, Sun, Moon, Filter
} from 'lucide-react';

type Theme = 'light' | 'dark';

interface Filters {
  clientIds: string[];
  programIds: string[];
  categories: string[];
  therapists: string[];
  dateRange: { start: Date; end: Date };
  targetIds: string[];
  minMastery: number;
  maxMastery: number;
}

export default function Dashboard() {
  const [theme, setTheme] = useState<Theme>('light');
  const [filters, setFilters] = useState<Filters>({
    clientIds: [],
    programIds: [],
    categories: [],
    therapists: [],
    dateRange: {
      start: subMonths(new Date(), 6),
      end: new Date(),
    },
    targetIds: [],
    minMastery: 0,
    maxMastery: 100,
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [drillDownTarget, setDrillDownTarget] = useState<string | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const filteredData = useMemo(() => {
    return dataPoints.filter(dp => {
      if (filters.clientIds.length && !filters.clientIds.includes(dp.clientId)) return false;
      if (filters.programIds.length && !filters.programIds.includes(dp.programId)) return false;
      if (filters.targetIds.length && !filters.targetIds.includes(dp.targetId)) return false;

      const target = allTargets.find(t => t.id === dp.targetId);
      if (target) {
        if (target.mastery < filters.minMastery || target.mastery > filters.maxMastery) return false;
      }

      const program = allPrograms.find(p => p.id === dp.programId);
      if (program && filters.categories.length && !filters.categories.includes(program.category)) {
        return false;
      }

      const client = clients.find(c => c.id === dp.clientId);
      if (client && filters.therapists.length && !filters.therapists.includes(client.therapist)) {
        return false;
      }

      if (!isWithinInterval(dp.date, filters.dateRange)) return false;

      return true;
    });
  }, [filters]);

  const stats = useMemo(() => {
    const activeClients = filters.clientIds.length ||
      new Set(filteredData.map(d => d.clientId)).size;

    const totalTrials = filteredData.reduce((sum, d) => sum + d.correct + d.incorrect, 0);
    const correctTrials = filteredData.reduce((sum, d) => sum + d.correct, 0);
    const avgAccuracy = totalTrials > 0 ? (correctTrials / totalTrials * 100) : 0;

    const activeProgramsSet = new Set(filteredData.map(d => d.programId));
    const activePrograms = activeProgramsSet.size;

    const targetSet = new Set(filteredData.map(d => d.targetId));
    const masteredTargets = Array.from(targetSet)
      .map(tid => allTargets.find(t => t.id === tid))
      .filter(t => t && t.mastery >= 80).length;

    return {
      activeClients,
      avgAccuracy,
      activePrograms,
      masteredTargets,
    };
  }, [filteredData, filters.clientIds]);

  const cumulativeGraphData = useMemo(() => {
    const monthlyData: { [key: string]: { correct: number; incorrect: number; date: string } } = {};

    filteredData.forEach(dp => {
      const monthKey = format(dp.date, 'MMM yyyy');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { correct: 0, incorrect: 0, date: monthKey };
      }
      monthlyData[monthKey].correct += dp.correct;
      monthlyData[monthKey].incorrect += dp.incorrect;
    });

    const sorted = Object.values(monthlyData).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulativeCorrect = 0;
    let cumulativeIncorrect = 0;

    return sorted.map(item => {
      cumulativeCorrect += item.correct;
      cumulativeIncorrect += item.incorrect;
      const total = cumulativeCorrect + cumulativeIncorrect;
      return {
        month: item.date,
        cumulative: cumulativeCorrect,
        accuracy: total > 0 ? ((cumulativeCorrect / total) * 100).toFixed(1) : 0,
        trials: total,
      };
    });
  }, [filteredData]);

  const programBreakdown = useMemo(() => {
    const programStats: { [key: string]: { correct: number; incorrect: number; program: string } } = {};

    filteredData.forEach(dp => {
      const program = allPrograms.find(p => p.id === dp.programId);
      if (!program) return;

      if (!programStats[program.id]) {
        programStats[program.id] = { correct: 0, incorrect: 0, program: program.name };
      }
      programStats[program.id].correct += dp.correct;
      programStats[program.id].incorrect += dp.incorrect;
    });

    return Object.values(programStats).map(item => ({
      ...item,
      accuracy: ((item.correct / (item.correct + item.incorrect)) * 100).toFixed(1),
      total: item.correct + item.incorrect,
    })).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const targetDrillDown = useMemo(() => {
    const targetStats: { [key: string]: any } = {};

    const relevantData = drillDownTarget
      ? filteredData.filter(d => d.targetId === drillDownTarget)
      : filteredData;

    relevantData.forEach(dp => {
      const target = allTargets.find(t => t.id === dp.targetId);
      if (!target) return;

      if (!targetStats[target.id]) {
        targetStats[target.id] = {
          id: target.id,
          name: target.name,
          programId: target.programId,
          mastery: target.mastery,
          correct: 0,
          incorrect: 0,
          sessions: 0,
        };
      }
      targetStats[target.id].correct += dp.correct;
      targetStats[target.id].incorrect += dp.incorrect;
      targetStats[target.id].sessions += 1;
    });

    return Object.values(targetStats).map((item: any) => ({
      ...item,
      accuracy: ((item.correct / (item.correct + item.incorrect)) * 100).toFixed(1),
      total: item.correct + item.incorrect,
      program: allPrograms.find(p => p.id === item.programId)?.name || '',
    })).sort((a, b) => b.total - a.total);
  }, [filteredData, drillDownTarget]);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clientSearch]);

  const filteredPrograms = useMemo(() => {
    return allPrograms.filter(p =>
      p.name.toLowerCase().includes(programSearch.toLowerCase())
    );
  }, [programSearch]);

  const filteredTargets = useMemo(() => {
    const programTargets = filters.programIds.length > 0
      ? allTargets.filter(t => filters.programIds.includes(t.programId))
      : allTargets;

    return programTargets.filter(t =>
      t.name.toLowerCase().includes(targetSearch.toLowerCase())
    );
  }, [targetSearch, filters.programIds]);

  const uniqueCategories = useMemo(() =>
    Array.from(new Set(allPrograms.map(p => p.category))),
    []
  );

  const uniqueTherapists = useMemo(() =>
    Array.from(new Set(clients.map(c => c.therapist))),
    []
  );

  const toggleFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => {
      const current = prev[key] as any[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleCardClick = (type: 'clients' | 'accuracy' | 'programs' | 'targets') => {
    setDrillDownTarget(null);

    const element = document.getElementById('target-drilldown');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (type === 'targets') {
      const masteredTargetIds = allTargets.filter(t => t.mastery >= 80).map(t => t.id);
      setFilters(prev => ({ ...prev, targetIds: masteredTargetIds }));
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex">
        {/* Sidebar Filters */}
        <div className={`w-80 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r min-h-screen p-6 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold dark:text-white">Filters</h2>
            </div>
            <button
              onClick={() => setFilters({
                clientIds: [],
                programIds: [],
                categories: [],
                therapists: [],
                dateRange: { start: subMonths(new Date(), 6), end: new Date() },
                targetIds: [],
                minMastery: 0,
                maxMastery: 100,
              })}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Clear All
            </button>
          </div>

          {/* Client Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Clients</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  onFocus={() => setShowClientDropdown(true)}
                  className="flex-1 outline-none bg-transparent text-sm dark:text-white"
                />
              </div>
              {showClientDropdown && (
                <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  {filteredClients.map(client => (
                    <div
                      key={client.id}
                      onClick={() => {
                        toggleFilter('clientIds', client.id);
                        setClientSearch('');
                      }}
                      className={`px-3 py-2 cursor-pointer text-sm ${
                        filters.clientIds.includes(client.id)
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white'
                      }`}
                    >
                      {client.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {filters.clientIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.clientIds.map(id => {
                  const client = clients.find(c => c.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-md text-xs">
                      {client?.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleFilter('clientIds', id)}
                      />
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Categories</label>
            <div className="space-y-2">
              {uniqueCategories.map(category => (
                <label key={category} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => toggleFilter('categories', category)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Program Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Programs</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search programs..."
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  onFocus={() => setShowProgramDropdown(true)}
                  className="flex-1 outline-none bg-transparent text-sm dark:text-white"
                />
              </div>
              {showProgramDropdown && (
                <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  {filteredPrograms.map(program => (
                    <div
                      key={program.id}
                      onClick={() => {
                        toggleFilter('programIds', program.id);
                        setProgramSearch('');
                      }}
                      className={`px-3 py-2 cursor-pointer text-sm ${
                        filters.programIds.includes(program.id)
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white'
                      }`}
                    >
                      <div>{program.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{program.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {filters.programIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.programIds.map(id => {
                  const program = allPrograms.find(p => p.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-md text-xs">
                      {program?.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleFilter('programIds', id)}
                      />
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Target Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Targets</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search targets..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  onFocus={() => setShowTargetDropdown(true)}
                  className="flex-1 outline-none bg-transparent text-sm dark:text-white"
                />
              </div>
              {showTargetDropdown && (
                <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  {filteredTargets.slice(0, 50).map(target => {
                    const program = allPrograms.find(p => p.id === target.programId);
                    return (
                      <div
                        key={target.id}
                        onClick={() => {
                          toggleFilter('targetIds', target.id);
                          setTargetSearch('');
                        }}
                        className={`px-3 py-2 cursor-pointer text-sm ${
                          filters.targetIds.includes(target.id)
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white'
                        }`}
                      >
                        <div>{target.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{program?.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {filters.targetIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {filters.targetIds.map(id => {
                  const target = allTargets.find(t => t.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-md text-xs">
                      {target?.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleFilter('targetIds', id)}
                      />
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Therapist Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Therapists</label>
            <div className="space-y-2">
              {uniqueTherapists.map(therapist => (
                <label key={therapist} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.therapists.includes(therapist)}
                    onChange={() => toggleFilter('therapists', therapist)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {therapist}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Mastery Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Mastery Range: {filters.minMastery}% - {filters.maxMastery}%
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minMastery}
                onChange={(e) => setFilters(prev => ({ ...prev, minMastery: parseInt(e.target.value) }))}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.maxMastery}
                onChange={(e) => setFilters(prev => ({ ...prev, maxMastery: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold dark:text-white">ABA Analytics Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive program analysis and client progress tracking
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-700'} hover:scale-110 transition-transform`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div
              onClick={() => handleCardClick('clients')}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Active Clients</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.activeClients}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200 opacity-80" />
              </div>
            </div>

            <div
              onClick={() => handleCardClick('accuracy')}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-green-900 to-green-800 hover:from-green-800 hover:to-green-700'
                  : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Avg Accuracy</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.avgAccuracy.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-200 opacity-80" />
              </div>
            </div>

            <div
              onClick={() => handleCardClick('programs')}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-purple-900 to-purple-800 hover:from-purple-800 hover:to-purple-700'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Active Programs</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.activePrograms}</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-200 opacity-80" />
              </div>
            </div>

            <div
              onClick={() => handleCardClick('targets')}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-orange-900 to-orange-800 hover:from-orange-800 hover:to-orange-700'
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Mastered Targets</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.masteredTargets}</p>
                </div>
                <TargetIcon className="w-12 h-12 text-orange-200 opacity-80" />
              </div>
            </div>
          </div>

          {/* Cumulative Graph */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-8`}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Cumulative Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativeGraphData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                  name="Cumulative Correct Trials"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Program Breakdown */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-8`}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Program Performance</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={programBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="program" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
                <Legend />
                <Bar dataKey="correct" fill="#10b981" name="Correct" />
                <Bar dataKey="incorrect" fill="#ef4444" name="Incorrect" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Target Drill Down */}
          <div id="target-drilldown" className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold dark:text-white">Target Drill Down</h2>
              {drillDownTarget && (
                <button
                  onClick={() => setDrillDownTarget(null)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear Selection
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Target</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Program</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Mastery</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Accuracy</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Total Trials</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold dark:text-white">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {targetDrillDown.map(target => (
                    <tr
                      key={target.id}
                      onClick={() => setDrillDownTarget(target.id)}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        drillDownTarget === target.id ? 'bg-primary-50 dark:bg-primary-900' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm dark:text-gray-300">{target.name}</td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">{target.program}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 w-20">
                            <div
                              className={`h-2 rounded-full ${
                                target.mastery >= 80 ? 'bg-green-500' :
                                target.mastery >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${target.mastery}%` }}
                            />
                          </div>
                          <span className="text-xs dark:text-gray-300">{target.mastery.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">{target.accuracy}%</td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">{target.total}</td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">{target.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
