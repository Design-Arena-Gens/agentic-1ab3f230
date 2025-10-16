"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

import styles from "./PokemonExplorer.module.css";
import type { FilterState, LegendaryFilter, PokemonEntry, SortOption } from "@/types/pokemon";
import { getTypeColor } from "@/lib/constants";
import {
  formatGenerationName,
  getAllGenerations,
  getAllPokemon,
  getAllTypes,
  getBaseStatTotal,
  humanize,
} from "@/lib/pokemonData";
import { filterAndSortPokemon, getAutocompleteSuggestions } from "@/lib/filtering";

const ALL_POKEMON = getAllPokemon();
const ALL_TYPES = getAllTypes();
const ALL_GENERATIONS = getAllGenerations();

const DEFAULT_FILTERS: FilterState = {
  searchTerm: "",
  selectedTypes: [],
  generation: "all",
  legendary: "all",
  sortBy: "id-asc",
};

const SORT_LABELS: Record<SortOption, string> = {
  "id-asc": "ID (Ascending)",
  "id-desc": "ID (Descending)",
  "name-asc": "Name (A-Z)",
  "stat-total-desc": "Total Stats (High → Low)",
};

const LEGENDARY_OPTIONS: { value: LegendaryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "legendary", label: "Legendary" },
  { value: "mythical", label: "Mythical" },
  { value: "non-legendary", label: "Non-Legendary" },
];

const formatPokemonId = (id: number) => `#${id.toString().padStart(3, "0")}`;

const sizeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

function PokemonExplorer() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const suggestionsId = useId();
  const inputId = useId();

  const filteredPokemon = useMemo(
    () => filterAndSortPokemon(ALL_POKEMON, filters),
    [filters],
  );

  const suggestions = useMemo(
    () => getAutocompleteSuggestions(ALL_POKEMON, filters.searchTerm, 8),
    [filters.searchTerm],
  );

  useEffect(() => {
    setAnnouncement(`${filteredPokemon.length} Pokémon found`);
  }, [filteredPokemon.length]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: value }));
    setAutocompleteOpen(value.trim().length > 0);
  };

  const handleSuggestionSelect = (pokemon: PokemonEntry) => {
    setFilters((prev) => ({ ...prev, searchTerm: pokemon.name }));
    setAutocompleteOpen(false);
    setHighlightedIndex(null);
  };

  const toggleType = (type: string) => {
    setFilters((prev) => {
      const exists = prev.selectedTypes.includes(type);
      return {
        ...prev,
        selectedTypes: exists
          ? prev.selectedTypes.filter((item) => item !== type)
          : [...prev.selectedTypes, type],
      };
    });
  };

  const handleLegendaryChange = (value: LegendaryFilter) => {
    setFilters((prev) => ({ ...prev, legendary: value }));
  };

  const handleSortChange = (value: SortOption) => {
    setFilters((prev) => ({ ...prev, sortBy: value }));
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm.trim()) count += 1;
    if (filters.selectedTypes.length) count += filters.selectedTypes.length;
    if (filters.generation !== "all") count += 1;
    if (filters.legendary !== "all") count += 1;
    if (filters.sortBy !== DEFAULT_FILTERS.sortBy) count += 1;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAutocompleteOpen(false);
    setHighlightedIndex(null);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!autocompleteOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      setAutocompleteOpen(true);
    }
    if (!suggestions.length) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const nextIndex = prev === null ? 0 : (prev + 1) % suggestions.length;
        return nextIndex;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev === null || prev <= 0) {
          return suggestions.length - 1;
        }
        return prev - 1;
      });
    } else if (event.key === "Enter" && highlightedIndex !== null) {
      event.preventDefault();
      const selected = suggestions[highlightedIndex];
      if (selected) {
        handleSuggestionSelect(selected);
      }
    } else if (event.key === "Escape") {
      setAutocompleteOpen(false);
      setHighlightedIndex(null);
    }
  };

  const shouldShowSuggestions = autocompleteOpen && suggestions.length > 0;

  return (
    <main id="main-content" className={styles.main}>
      <div aria-live="polite" className={styles.visuallyHidden}>
        {announcement}
      </div>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pokémon Database</span>
          <h1 className={styles.title}>Explore the Pokédex like never before</h1>
          <p className={styles.lead}>
            Discover detailed stats, abilities, moves, and locations for every Pokémon in the first
            two generations. Use powerful filtering, search, and sorting to find the perfect team.
          </p>
        </div>
        <div className={styles.summaryCards}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Catalogue Size</span>
            <strong className={styles.summaryValue}>{ALL_POKEMON.length}</strong>
            <p className={styles.summaryHint}>Pokémon from Generations I &amp; II</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Elemental Types</span>
            <strong className={styles.summaryValue}>{ALL_TYPES.length}</strong>
            <p className={styles.summaryHint}>Dual-type support included</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Active Filters</span>
            <strong className={styles.summaryValue}>{activeFiltersCount}</strong>
            <p className={styles.summaryHint}>Refine, sort, and compare</p>
          </article>
        </div>
      </header>

      <section aria-labelledby="search-heading" className={styles.controls}>
        <div className={styles.searchPanel}>
          <div className={styles.searchHeader}>
            <h2 id="search-heading">Search the Pokédex</h2>
            <p className={styles.searchHint}>
              Start typing a Pokémon name, type, or ability. Use the arrow keys to navigate
              suggestions.
            </p>
          </div>
          <div className={styles.searchBox}>
            <label className={styles.visuallyHidden} htmlFor={inputId}>
              Search Pokémon by name, type, or ability
            </label>
            <input
              id={inputId}
              className={styles.searchInput}
              type="search"
              placeholder="e.g. Pikachu, fire, Levitate"
              value={filters.searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              onFocus={() => setAutocompleteOpen(Boolean(filters.searchTerm.trim()))}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  setAutocompleteOpen(false);
                  setHighlightedIndex(null);
                }, 120);
              }}
              aria-autocomplete="list"
              aria-controls={suggestionsId}
              aria-expanded={shouldShowSuggestions}
              aria-activedescendant={
                highlightedIndex !== null && suggestions[highlightedIndex]
                  ? `${suggestionsId}-item-${highlightedIndex}`
                  : undefined
              }
              role="combobox"
            />
            {shouldShowSuggestions && (
              <ul
                id={suggestionsId}
                role="listbox"
                className={styles.autocompleteList}
                aria-label="Search suggestions"
              >
                {suggestions.map((pokemon, index) => (
                  <li key={pokemon.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`${suggestionsId}-item-${index}`}
                      data-active={highlightedIndex === index}
                      aria-selected={highlightedIndex === index}
                      className={styles.autocompleteItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(pokemon)}
                    >
                      <span>{humanize(pokemon.name)}</span>
                      <span className={styles.autocompleteMeta}>{formatPokemonId(pokemon.id)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.filterPanel}>
          <div className={styles.filterRow}>
            <fieldset className={styles.fieldset}>
              <legend>Filter by generation</legend>
              <label className={styles.selectWrapper}>
                <span className={styles.visuallyHidden}>Generation</span>
                <select
                  value={filters.generation}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, generation: event.target.value as FilterState["generation"] }))
                  }
                  aria-label="Select generation"
                >
                  <option value="all">All generations</option>
                  {ALL_GENERATIONS.map((generation) => (
                    <option key={generation} value={generation}>
                      {formatGenerationName(generation)}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Legendary status</legend>
              <div className={styles.legendaryGroup} role="radiogroup" aria-label="Legendary filter">
                {LEGENDARY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={clsx(styles.legendaryOption, {
                      [styles.legendaryOptionActive]: filters.legendary === option.value,
                    })}
                  >
                    <input
                      type="radio"
                      name="legendary"
                      value={option.value}
                      checked={filters.legendary === option.value}
                      onChange={() => handleLegendaryChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className={styles.fieldset}>
            <legend>Filter by type</legend>
            <div className={styles.typesGrid}>
              {ALL_TYPES.map((type) => (
                <label
                  key={type}
                  className={clsx(styles.typeOption, {
                    [styles.typeOptionActive]: filters.selectedTypes.includes(type),
                  })}
                  style={{
                    backgroundColor: filters.selectedTypes.includes(type)
                      ? getTypeColor(type)
                      : undefined,
                    color: filters.selectedTypes.includes(type) ? "#0b1120" : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    value={type}
                    checked={filters.selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span>{humanize(type)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.sortRow}>
            <label className={styles.sortLabel}>
              <span>Sort results by</span>
              <select
                value={filters.sortBy}
                onChange={(event) => handleSortChange(event.target.value as SortOption)}
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section aria-live="polite" aria-busy={false} className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <h2>
            {filteredPokemon.length} Pokémon
            {filters.searchTerm ? ` matching “${filters.searchTerm}”` : " available"}
          </h2>
          <p className={styles.resultSummary}>
            Showing results sorted by {SORT_LABELS[filters.sortBy]}.
          </p>
        </div>

        {filteredPokemon.length === 0 ? (
          <div className={styles.noResults} role="status">
            <h3>No Pokémon found</h3>
            <p>Try adjusting your filters or searching for a different name or type.</p>
            <button type="button" onClick={clearFilters} className={styles.resetButton}>
              Reset filters
            </button>
          </div>
        ) : (
          <ol className={styles.grid} role="list">
            {filteredPokemon.map((pokemon) => (
              <li key={pokemon.id}>
                <PokemonCard pokemon={pokemon} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function PokemonCard({ pokemon }: { pokemon: PokemonEntry }) {
  const statTotal = getBaseStatTotal(pokemon.stats);
  const primaryType = pokemon.types[0];
  const accentColor = getTypeColor(primaryType);
  const spriteAlt = pokemon.image ? `${humanize(pokemon.name)} artwork` : `${humanize(pokemon.name)} silhouette`;

  return (
    <article className={styles.card} style={{ borderColor: `${accentColor}33` }}>
      <Link href={`/pokemon/${pokemon.name}`} className={styles.cardLink}>
        <div className={styles.cardMedia} style={{ background: `${accentColor}1a` }}>
          {pokemon.image ? (
            <Image
              src={pokemon.image}
              alt={spriteAlt}
              width={176}
              height={176}
              priority={pokemon.id <= 6}
            />
          ) : (
            <div className={styles.placeholderSprite} aria-hidden>
              <span>{humanize(pokemon.name).charAt(0)}</span>
            </div>
          )}
          <span className={styles.pokemonId}>{formatPokemonId(pokemon.id)}</span>
        </div>
        <div className={styles.cardBody}>
          <header className={styles.cardHeader}>
            <h3>{humanize(pokemon.name)}</h3>
            <div className={styles.typeChips}>
              {pokemon.types.map((type) => (
                <span key={type} className={styles.typeChip} style={{ backgroundColor: getTypeColor(type) }}>
                  {humanize(type)}
                </span>
              ))}
            </div>
          </header>
          <p className={styles.cardDescription}>{pokemon.flavorText}</p>
        </div>
        <footer className={styles.cardFooter}>
          <dl className={styles.cardStats}>
            <div>
              <dt>Total Stats</dt>
              <dd>{statTotal}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>{sizeFormatter.format(pokemon.height / 10)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{sizeFormatter.format(pokemon.weight / 10)} kg</dd>
            </div>
          </dl>
          <span className={clsx(styles.cardCta)} aria-hidden>
            View details →
          </span>
        </footer>
      </Link>
    </article>
  );
}

export default PokemonExplorer;
