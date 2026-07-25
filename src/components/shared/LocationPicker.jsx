// LocationPicker — city search + geolocation rebuilt on kit primitives.
//
// Public contract unchanged: `value` is a location object ({name, lat, lon})
// or a legacy coordinate string; `onChange(location)` fires when a suggestion
// or the current position is chosen. Nominatim fetch/debounce/geolocation
// logic is untouched.
//
// Internals: kit TextInput for the query field (with its built-in loading
// spinner), kit List/ListItem rows for the suggestion dropdown, kit
// IconButton for "use my location", tokens everywhere.
import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { MapPin } from 'lucide-solid';
import { TextInput, IconButton, List, ListItem, Text } from '../kit';

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

  const handleInput = (val) => {
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
    const shortName = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : loc.display_name;

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
      <div class="relative flex-1 min-w-0">
        <TextInput
          label="Search city"
          isLabelHidden
          value={query()}
          onChange={handleInput}
          onFocus={() => setIsOpen(true)}
          placeholder="Search city..."
          isLoading={isLoading()}
        />

        <Show when={isOpen() && (suggestions().length > 0 || error())}>
          <div class="absolute top-full left-0 right-0 z-50 mt-1 box-border rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
            <Show when={error()}>
              <Text type="supporting" color="secondary" display="block" class="p-3">
                {error()}
              </Text>
            </Show>
            <List aria-label="Location suggestions" hasDividers class="p-1">
              <For each={suggestions()}>
                {(loc) => (
                  <ListItem
                    label={loc.display_name}
                    title={loc.display_name}
                    onClick={() => selectLocation(loc)}
                  />
                )}
              </For>
            </List>
          </div>
        </Show>
      </div>

      <IconButton
        label="Use my location"
        icon={<MapPin aria-hidden="true" />}
        onClick={geolocate}
      />
    </div>
  );
}

export default LocationPicker;
