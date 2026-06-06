import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';

function LocationPicker(props) {
  const [query, setQuery] = createSignal('');
  const [suggestions, setSuggestions] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isOpen, setIsOpen] = createSignal(false);
  const [error, setError] = createSignal(null);
  
  // Initialize input from props.value if it exists
  createEffect(() => {
    if (props.value && props.value.name) {
      setQuery(props.value.name);
    } else if (props.value && typeof props.value === 'string' && !props.value.startsWith('{')) {
      // Legacy coordinate string
      setQuery(props.value);
    }
  });

  let debounceTimer;

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    
    clearTimeout(debounceTimer);
    
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5`);
        if (!res.ok) throw new Error('Failed to fetch locations');
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        setError("Couldn't load suggestions");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const selectLocation = (loc) => {
    // Determine a concise name
    const parts = loc.display_name.split(', ');
    const shortName = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length-1]}` : loc.display_name;
    
    const newVal = {
      name: shortName,
      lat: loc.lat,
      lon: loc.lon,
      full_name: loc.display_name
    };
    
    setQuery(shortName);
    setIsOpen(false);
    if (props.onChange) {
      props.onChange(newVal);
    }
  };

  const geolocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLoading(true);
    setQuery("Locating...");
    
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        if (res.ok) {
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.county || "Current Location";
          const state = data.address.state || data.address.country;
          const shortName = state ? `${city}, ${state}` : city;
          
          setQuery(shortName);
          if (props.onChange) {
            props.onChange({ name: shortName, lat: lat.toString(), lon: lon.toString() });
          }
        } else {
          throw new Error('Reverse geocoding failed');
        }
      } catch (err) {
        // Fallback if reverse geocoding fails
        setQuery(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        if (props.onChange) {
          props.onChange({ name: `Current Location`, lat: lat.toString(), lon: lon.toString() });
        }
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      setIsLoading(false);
      setQuery(props.value?.name || "");
      alert(`Unable to retrieve your location: ${error.message}`);
    });
  };

  // Close dropdown when clicking outside
  let containerRef;
  const handleClickOutside = (e) => {
    if (containerRef && !containerRef.contains(e.target)) {
      setIsOpen(false);
    }
  };

  createEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
  });

  return (
    <div class="relative w-full flex items-center gap-2" ref={containerRef}>
      <div class="relative flex-1">
        <input 
          type="text" 
          value={query()}
          onInput={handleInput}
          onFocus={() => setIsOpen(true)}
          placeholder="Search city..."
          class="w-full bg-transparent border border-border-theme rounded-lg py-1.5 px-3 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
        />
        <Show when={isLoading()}>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </Show>
        
        <Show when={isOpen() && (suggestions().length > 0 || error())}>
          <div class="absolute top-full left-0 right-0 mt-1 bg-card border border-border-theme rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
            <Show when={error()}>
              <div class="p-3 text-[12px] text-text-muted">{error()}</div>
            </Show>
            <For each={suggestions()}>
              {(loc) => (
                <div 
                  class="p-2.5 px-3 text-[13px] text-text-primary hover:bg-accent/10 cursor-pointer border-b border-border-theme last:border-b-0 truncate transition-colors"
                  onClick={() => selectLocation(loc)}
                  title={loc.display_name}
                >
                  {loc.display_name}
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      
      <button
        onClick={geolocate}
        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-text-primary/5 hover:bg-accent/20 text-text-primary border border-border-theme cursor-pointer transition-colors"
        title="Use My Location"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
    </div>
  );
}

export default LocationPicker;
