export interface PokemonAbility {
  name: string;
  hidden: boolean;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonMove {
  name: string;
  method: string;
  levelLearnedAt: number | null;
}

export interface PokemonSpriteVariants {
  default: string | null;
  shiny: string | null;
}

export interface PokemonEvolutionNode {
  id: number | null;
  name: string;
  stage: number;
}

export interface PokemonEntry {
  id: number;
  name: string;
  height: number;
  weight: number;
  baseExperience: number;
  types: string[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  moves: PokemonMove[];
  image: string | null;
  spriteVariants: PokemonSpriteVariants;
  generation: string | null;
  habitat: string | null;
  isLegendary: boolean;
  isMythical: boolean;
  flavorText: string;
  evolutionChain: PokemonEvolutionNode[];
  locations: string[];
}

export type LegendaryFilter = 'all' | 'legendary' | 'mythical' | 'non-legendary';

export type SortOption = 'name-asc' | 'id-asc' | 'id-desc' | 'stat-total-desc';

export interface FilterState {
  searchTerm: string;
  selectedTypes: string[];
  generation: string | 'all';
  legendary: LegendaryFilter;
  sortBy: SortOption;
}
