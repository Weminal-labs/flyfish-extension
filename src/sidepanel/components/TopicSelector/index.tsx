import React, { useState, useRef, useEffect } from 'react';
import './styles.css';

interface TopicSelectorProps {
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  predefinedTopics?: string[];
  onDropdownHeightChange?: (height: number) => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
  selectedTopic,
  onTopicChange,
  predefinedTopics = ["Aptos", "Movement"],
  onDropdownHeightChange
}) => {
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [dropdownHeight, setDropdownHeight] = useState(0);

  const selectContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.select-container') && isDropdownOpen) {
        setIsDropdownOpen(false);
        setDropdownHeight(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Cập nhật chiều cao dropdown khi nó thay đổi
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const height = dropdownRef.current.offsetHeight;
      setDropdownHeight(height);
      if (onDropdownHeightChange) {
        onDropdownHeightChange(height);
      }
    } else {
      setDropdownHeight(0);
      if (onDropdownHeightChange) {
        onDropdownHeightChange(0);
      }
    }
  }, [isDropdownOpen, showCustomInput, onDropdownHeightChange]);

  // Xác định vị trí dropdown khi mở
  const toggleDropdown = () => {
    if (!isDropdownOpen) {
      // Luôn hiển thị dropdown phía dưới
      setDropdownPosition('bottom');

      // Đặt timeout để đảm bảo dropdownRef đã được render
      setTimeout(() => {
        if (dropdownRef.current) {
          const height = dropdownRef.current.offsetHeight;
          setDropdownHeight(height);
          if (onDropdownHeightChange) {
            onDropdownHeightChange(height);
          }
        }
      }, 0);
    } else {
      setDropdownHeight(0);
      if (onDropdownHeightChange) {
        onDropdownHeightChange(0);
      }
    }

    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleTopicSelect = (topic: string) => {
    onTopicChange(topic);
    chrome.storage.local.set({ selectedTopic: topic });
    setIsDropdownOpen(false);
    setDropdownHeight(0);
    if (onDropdownHeightChange) {
      onDropdownHeightChange(0);
    }
  };

  const handleAddCustomTopic = () => {
    if (customTopic.trim() !== '') {
      onTopicChange(customTopic.trim());
      setCustomTopic('');
      setShowCustomInput(false);
      setIsDropdownOpen(false);
      setDropdownHeight(0);
      if (onDropdownHeightChange) {
        onDropdownHeightChange(0);
      }
    }
  };

  return (
    <div className="topic-selector-wrapper">
      <div className="select-container" ref={selectContainerRef}>
        <div
          className="select-field"
          onClick={toggleDropdown}
        >
          {selectedTopic ? (
            <span className="selected-value">{selectedTopic}</span>
          ) : (
            <span className="placeholder">Select a topic</span>
          )}
          <span className={`arrow-icon ${isDropdownOpen ? 'open' : ''}`}>▼</span>
        </div>

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className={`select-dropdown ${dropdownPosition}`}
          >
            {predefinedTopics.map((topic) => (
              <div
                key={topic}
                className={`select-option ${selectedTopic === topic ? 'selected' : ''}`}
                onClick={() => handleTopicSelect(topic)}
              >
                <span className="option-text">{topic}</span>
                {selectedTopic === topic && <span className="check-icon">✓</span>}
              </div>
            ))}

            <div className="select-option add-custom" onClick={() => setShowCustomInput(true)}>
              <span className="option-text">+ Add custom topic</span>
            </div>

            {showCustomInput && (
              <div className="custom-option-container">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Enter custom topic"
                  className="custom-option-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomTopic();
                    if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomTopic('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="custom-option-actions">
                  <button
                    className="custom-option-button add"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCustomTopic();
                    }}
                  >
                    Add
                  </button>
                  <button
                    className="custom-option-button cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomInput(false);
                      setCustomTopic('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer để tạo khoảng cách khi dropdown hiển thị */}
      <div
        className="dropdown-spacer"
        style={{
          height: dropdownPosition === 'bottom' ? dropdownHeight : 0,
          transition: 'height 0.2s ease'
        }}
      />
    </div>
  );
};

export default TopicSelector;
