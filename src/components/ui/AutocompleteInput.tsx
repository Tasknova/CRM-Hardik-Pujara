import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, User } from 'lucide-react';

interface AutocompleteOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption | null) => void;
  options: AutocompleteOption[];
  loading?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  options,
  loading = false,
  required = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = options.filter(option =>
        option.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    
    // If the value doesn't match any existing option, clear selection
    const exactMatch = options.find(option => 
      option.name.toLowerCase() === newValue.toLowerCase()
    );
    if (!exactMatch) {
      onSelect(null);
    }
  };

  const handleOptionSelect = (option: AutocompleteOption) => {
    onChange(option.name);
    onSelect(option);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (value.trim()) {
      // Signal that we want to create a new entry
      onSelect({ id: 'new', name: value.trim() });
      setIsOpen(false);
    }
  };

  const exactMatch = options.find(option => 
    option.name.toLowerCase() === value.toLowerCase()
  );

  const showCreateOption = value.trim() && !exactMatch && filteredOptions.length === 0;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-gray-500 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <>
              {filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.name}</div>
                      {(option.email || option.phone) && (
                        <div className="text-xs text-gray-500">
                          {option.email && <span>{option.email}</span>}
                          {option.email && option.phone && <span> • </span>}
                          {option.phone && <span>{option.phone}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {showCreateOption && (
                <div
                  onClick={handleCreateNew}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-t border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Create "{value}"</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-6">
                    Add as new {label.toLowerCase()}
                  </div>
                </div>
              )}
              
              {!loading && filteredOptions.length === 0 && !showCreateOption && (
                <div className="px-3 py-2 text-gray-500 text-center">
                  No matches found
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
