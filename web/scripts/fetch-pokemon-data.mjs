#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const OUTPUT_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'src',
  'data',
  'pokemon.json',
);

const API_BASE = 'https://pokeapi.co/api/v2';
const LIMIT = parseInt(process.env.POKEMON_LIMIT ?? '251', 10);
const CONCURRENCY = parseInt(process.env.POKEMON_CONCURRENCY ?? '8', 10);

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (text) =>
  text
    ?.replace(/\s+/g, ' ')
    .replace(/[\u000c\u000b\u0000]/g, ' ')
    .trim() ?? '';

function formatName(name) {
  return name.replace(/-/g, ' ');
}

async function fetchEvolutionChain(url) {
  if (!url) {
    return [];
  }
  const data = await fetchJson(url);
  const chain = [];

  function traverse(node, stage = 0) {
    if (!node) {
      return;
    }
    const speciesUrl = node.species?.url;
    const idMatch = speciesUrl?.match(/\/(\d+)\/?$/);
    chain.push({
      id: idMatch ? Number(idMatch[1]) : null,
      name: node.species?.name ?? '',
      stage,
    });
    for (const evolution of node.evolves_to ?? []) {
      traverse(evolution, stage + 1);
    }
  }

  traverse(data.chain);
  return chain;
}

async function fetchLocations(url) {
  if (!url) {
    return [];
  }
  const data = await fetchJson(url);
  const locations = new Set();
  for (const entry of data) {
    const locationName = entry.location_area?.name;
    if (locationName) {
      locations.add(formatName(locationName));
    }
    if (locations.size >= 12) {
      break;
    }
  }
  return Array.from(locations);
}

function extractMoves(moves) {
  if (!Array.isArray(moves)) {
    return [];
  }
  const levelUpMoves = moves
    .map((move) => {
      const details = move.version_group_details?.find(
        (detail) => detail.move_learn_method?.name === 'level-up',
      );
      return {
        name: move.move?.name ?? '',
        method: details?.move_learn_method?.name ?? move.version_group_details?.[0]?.move_learn_method?.name ?? 'unknown',
        levelLearnedAt: details?.level_learned_at ?? null,
      };
    })
    .filter((move) => move.name);

  const sortedLevelUp = levelUpMoves
    .filter((move) => move.levelLearnedAt !== null)
    .sort((a, b) => (a.levelLearnedAt ?? 0) - (b.levelLearnedAt ?? 0));

  const otherMoves = levelUpMoves
    .filter((move) => move.levelLearnedAt === null)
    .slice(0, 20);

  return [...sortedLevelUp.slice(0, 30), ...otherMoves];
}

function extractStats(stats) {
  if (!Array.isArray(stats)) {
    return [];
  }
  return stats.map((stat) => ({
    name: stat.stat?.name ?? '',
    value: stat.base_stat ?? 0,
  }));
}

function extractAbilities(abilities) {
  if (!Array.isArray(abilities)) {
    return [];
  }
  return abilities.map((ability) => ({
    name: ability.ability?.name ?? '',
    hidden: Boolean(ability.is_hidden),
  }));
}

async function fetchPokemonDetail(entry, index, total) {
  const baseData = await fetchJson(entry.url);
  const speciesData = await fetchJson(baseData.species?.url);
  const evolutionChain = await fetchEvolutionChain(speciesData.evolution_chain?.url);
  const locations = await fetchLocations(baseData.location_area_encounters);

  const image =
    baseData.sprites?.other?.['official-artwork']?.front_default ??
    baseData.sprites?.front_default ??
    null;

  const englishFlavor = speciesData.flavor_text_entries?.find(
    (entry) => entry.language?.name === 'en',
  );

  const payload = {
    id: baseData.id,
    name: baseData.name,
    height: baseData.height,
    weight: baseData.weight,
    baseExperience: baseData.base_experience,
    types: (baseData.types ?? []).map((type) => type.type?.name ?? '').filter(Boolean),
    abilities: extractAbilities(baseData.abilities),
    stats: extractStats(baseData.stats),
    moves: extractMoves(baseData.moves),
    image,
    spriteVariants: {
      default: baseData.sprites?.front_default ?? null,
      shiny: baseData.sprites?.front_shiny ?? null,
    },
    generation: speciesData.generation?.name ?? null,
    habitat: speciesData.habitat?.name ?? null,
    isLegendary: Boolean(speciesData.is_legendary),
    isMythical: Boolean(speciesData.is_mythical),
    flavorText: normalizeText(englishFlavor?.flavor_text ?? ''),
    evolutionChain,
    locations,
  };

  console.log(`Fetched ${entry.name} (${index + 1}/${total})`);
  return payload;
}

async function main() {
  console.log(`Fetching data for ${LIMIT} Pokémon...`);
  const list = await fetchJson(`${API_BASE}/pokemon?limit=${LIMIT}`);
  const entries = list.results ?? [];
  const total = entries.length;
  const results = new Array(total);
  let pointer = 0;
  let completed = 0;

  async function worker(workerId) {
    while (true) {
      let currentIndex;
      let entry;
      if (pointer < total) {
        currentIndex = pointer;
        entry = entries[pointer];
        pointer += 1;
      } else {
        break;
      }
      try {
        results[currentIndex] = await fetchPokemonDetail(entry, currentIndex, total);
      } catch (error) {
        console.error(`Worker ${workerId} failed for ${entry.name}:`, error.message);
        pointer = Math.min(pointer, total);
        await sleep(500);
        try {
          results[currentIndex] = await fetchPokemonDetail(entry, currentIndex, total);
        } catch (retryError) {
          console.error(`Worker ${workerId} retry failed for ${entry.name}:`, retryError.message);
          results[currentIndex] = null;
        }
      }
      completed += 1;
      if (completed % 10 === 0) {
        console.log(`Progress: ${(completed / total * 100).toFixed(1)}%`);
      }
      await sleep(100);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, (_, index) =>
    worker(index + 1),
  );
  await Promise.all(workers);

  const filteredResults = results
    .filter(Boolean)
    .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(filteredResults, null, 2));
  console.log(`Saved ${filteredResults.length} Pokémon entries to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Failed to build Pokémon dataset:', error);
  process.exit(1);
});
