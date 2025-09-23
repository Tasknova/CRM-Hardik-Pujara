import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal';
import { format, addMonths, subMonths, isSameDay } from 'date-fns';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { toast } from 'sonner';

// Define the Holiday interface
export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  created_at?: string;
}

interface HolidayCalendarProps {
  holidays: Holiday[];
  onAddHoliday: (holiday: Omit<Holiday, 'id' | 'created_at'>) => void;
  onUpdateHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
  isAdmin?: boolean;
}

const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  holidays,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  isAdmin = false,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showHolidayForm, setShowHolidayForm] = useState<boolean>(false);
  const [showHolidayDetails, setShowHolidayDetails] = useState<boolean>(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState<Omit<Holiday, 'id' | 'created_at'>>({ 
    name: '', 
    date: '', 
    description: '' 
  });

  // Navigation functions
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get days in month for calendar grid
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = isSameDay(date, new Date());
      const holiday = holidays.find(h => {
        const holidayDate = new Date(h.date);
        return isSameDay(holidayDate, date);
      });
      
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday,
        holiday
      });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = format(currentDate, 'MMMM yyyy');
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const holiday = holidays.find(h => {
      const holidayDate = new Date(h.date);
      return isSameDay(holidayDate, date);
    });

    if (holiday) {
      setSelectedHoliday(holiday);
      setShowHolidayDetails(true);
    } else if (isAdmin) {
      setHolidayForm({
        holiday_name: '',
        date: date.toISOString().split('T')[0],
        description: ''
      });
      setShowHolidayForm(true);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }
    
    if (!holidayForm.date) {
      toast.error('Please select a date');
      return;
    }
    
    // Check if date is in the past (only for new holidays)
    const selectedDate = new Date(holidayForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Cannot add a holiday in the past');
      return;
    }
    
    if (selectedHoliday) {
      onUpdateHoliday({ ...selectedHoliday, ...holidayForm });
    } else {
      onAddHoliday(holidayForm);
    }
    
    setShowHolidayForm(false);
    setShowHolidayDetails(false);
    setSelectedHoliday(null);
  };

  // Handle delete holiday
  const handleDeleteHoliday = () => {
    if (selectedHoliday?.id) {
      onDeleteHoliday(selectedHoliday.id);
      setShowHolidayDetails(false);
      setSelectedHoliday(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">{monthName}</h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => {
              setHolidayForm({ name: '', date: '', description: '' });
              setSelectedHoliday(null);
              setShowHolidayForm(true);
            }}
          >
            Add Holiday
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((dayData, index) => {
          if (dayData.day === null) {
            return <div key={`empty-${index}`} className="h-16 border border-gray-100" />;
          }

          const { day, date, isToday, holiday } = dayData as {
            day: number;
            date: Date;
            isToday: boolean;
            holiday?: Holiday;
          };

          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isInPast = date < new Date() && !isSameDay(date, new Date());

          return (
            <div
              key={day}
              onClick={() => handleDateClick(date)}
              className={`
                h-24 p-1 border border-gray-100 cursor-pointer
                ${isToday ? 'bg-blue-50' : ''}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${isInPast ? 'bg-gray-50' : 'hover:bg-gray-50'}
              `}
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between">
                  <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                    {day}
                  </span>
                  {holiday && (
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </div>
                {holiday && (
                  <div className="mt-1 text-xs text-gray-700 truncate">
                    {holiday.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Holiday Form Modal */}
      <Modal 
        isOpen={showHolidayForm} 
        onClose={() => setShowHolidayForm(false)}
        title={selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({...holidayForm, name: e.target.value})}
              placeholder="Enter holiday name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={holidayForm.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setHolidayForm({...holidayForm, date: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({...holidayForm, description: e.target.value})}
              placeholder="Enter holiday description (optional)"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowHolidayForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {selectedHoliday ? 'Update Holiday' : 'Add Holiday'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Holiday Details Modal */}
      <Modal 
        isOpen={showHolidayDetails && !!selectedHoliday}
        onClose={() => setShowHolidayDetails(false)}
        title="Holiday Details"
      >
        {selectedHoliday && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedHoliday.name}</h3>
              <p className="text-gray-500">
                {format(new Date(selectedHoliday.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            
            {selectedHoliday.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Description</h4>
                <p className="mt-1 text-gray-600">{selectedHoliday.description}</p>
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end space-x-2 pt-4">
                {new Date(selectedHoliday.date) >= new Date() && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setHolidayForm({
                        name: selectedHoliday.name,
                        date: selectedHoliday.date,
                        description: selectedHoliday.description || ''
                      });
                      setShowHolidayDetails(false);
                      setShowHolidayForm(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button 
                  variant="danger"
                  onClick={handleDeleteHoliday}
                  disabled={new Date(selectedHoliday.date) < new Date()}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default HolidayCalendar;
