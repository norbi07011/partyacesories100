
import React, { useState, useEffect } from 'react';
import { DayOverride, Language } from '../types';

interface CustomCalendarProps {
  bookedDates: string[]; // Dates with at least one booking
  onSelect: (date: string) => void;
  selectedDate: string;
  overrides?: DayOverride[]; // Admin manual statuses
  lang?: Language;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ bookedDates, onSelect, selectedDate, overrides = [], lang = 'nl' }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const monthName = currentMonth.toLocaleString(lang === 'nl' ? 'nl-NL' : lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'long' });
  const year = currentMonth.getFullYear();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getDayStatus = (dateStr: string) => {
    // Check manual overrides first
    const override = overrides.find(o => o.date === dateStr);
    if (override) return override.status;

    // Default logic based on bookings
    const hasBookings = bookedDates.includes(dateStr);
    if (hasBookings) return 'partial'; // Orange
    return 'available'; // Green
  };

  const renderDays = () => {
    const days = [];
    const blanks = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < blanks; i++) {
      days.push(<div key={`blank-${i}`} className="p-4"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = getDayStatus(dateStr);
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      // Color mapping
      let colorClass = 'glass border-white/5 hover:border-pink-500/50';
      if (status === 'available') colorClass = 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20';
      if (status === 'partial') colorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20';
      if (status === 'blocked') colorClass = 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed';

      if (isSelected) {
        colorClass = 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] border-pink-400 ring-4 ring-pink-500/30 scale-105 z-10';
      }

      days.push(
        <button
          key={d}
          onClick={() => onSelect(dateStr)}
          className={`relative p-4 rounded-2xl font-black transition-all duration-300 group flex items-center justify-center text-sm border ${colorClass} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}`}
        >
          <span className="relative z-10">{d}</span>
          {isToday && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="glass rounded-[2.5rem] p-8 border-white/5 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <h3 className="text-2xl font-black font-display uppercase tracking-tighter">
            {monthName} <span className="text-pink-500">{year}</span>
          </h3>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={handleNextMonth} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {(lang === 'nl' ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] : lang === 'pl' ? ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']).map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pb-4">{day}</div>
        ))}
        {renderDays()}
      </div>
      
      <div className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'nl' ? 'Beschikbaar' : lang === 'pl' ? 'Dostępne' : 'Available'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'nl' ? 'Gedeeltelijk' : lang === 'pl' ? 'Częściowo' : 'Partial'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'nl' ? 'Geblokkeerd' : lang === 'pl' ? 'Zablokowane' : 'Blocked'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500 ring-2 ring-pink-500/50"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-pink-500">{lang === 'nl' ? 'Geselecteerd' : lang === 'pl' ? 'Wybrane' : 'Selected'}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomCalendar;
