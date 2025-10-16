import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";
import { getTypeColor } from "@/lib/constants";
import {
  formatGenerationName,
  getAllPokemon,
  getBaseStatTotal,
  getPokemonByName,
  humanize,
} from "@/lib/pokemonData";
import type { PokemonEvolutionNode } from "@/types/pokemon";

type PageProps = {
  params: Promise<{ name: string }>;
};

const formatPokemonId = (id: number) => `#${id.toString().padStart(3, "0")}`;

const formatHeight = (heightDecimetres: number) => `${(heightDecimetres / 10).toFixed(1)} m`;

const formatWeight = (weightHectograms: number) => `${(weightHectograms / 10).toFixed(1)} kg`;

const MOVES_DISPLAY_LIMIT = 16;

function groupEvolutionChain(chain: PokemonEvolutionNode[]) {
  const groups: PokemonEvolutionNode[][] = [];
  chain.forEach((node) => {
    if (!groups[node.stage]) {
      groups[node.stage] = [];
    }
    groups[node.stage]?.push(node);
  });
  return groups;
}

export async function generateStaticParams() {
  const pokemon = getAllPokemon();
  return pokemon.map((entry) => ({ name: entry.name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const pokemon = getPokemonByName(name);
  if (!pokemon) {
    return {
      title: "Pokémon not found",
    };
  }

  const displayName = humanize(pokemon.name);
  return {
    title: `${displayName} | Pokédex Explorer`,
    description: `Discover ${displayName}'s stats, abilities, moves, locations, and evolution chain.`,
  };
}

export default async function PokemonDetailPage({ params }: PageProps) {
  const { name } = await params;
  const pokemon = getPokemonByName(name);

  if (!pokemon) {
    notFound();
  }

  const displayName = humanize(pokemon.name);
  const primaryType = pokemon.types[0];
  const accent = getTypeColor(primaryType);
  const statTotal = getBaseStatTotal(pokemon.stats);
  const evolutionStages = groupEvolutionChain(pokemon.evolutionChain);

  const levelUpMoves = pokemon.moves
    .filter((move) => move.levelLearnedAt !== null)
    .sort((a, b) => (a.levelLearnedAt ?? 0) - (b.levelLearnedAt ?? 0));
  const additionalMoves = pokemon.moves
    .filter((move) => move.levelLearnedAt === null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const combinedMoves = [...levelUpMoves, ...additionalMoves].slice(0, MOVES_DISPLAY_LIMIT);

  return (
    <main id="main-content" className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>
          ← Back to Pokédex
        </Link>
      </nav>

      <header className={styles.header} style={{ borderColor: `${accent}55` }}>
        <div className={styles.heroMedia} style={{ background: `${accent}1a` }}>
          {pokemon.image ? (
            <Image
              src={pokemon.image}
              alt={`${displayName} official artwork`}
              width={320}
              height={320}
              priority
            />
          ) : (
            <div className={styles.heroPlaceholder} aria-hidden>
              <span>{displayName.charAt(0)}</span>
            </div>
          )}
          <div className={styles.spriteBar}>
            {pokemon.spriteVariants.default && (
              <Image
                src={pokemon.spriteVariants.default}
                alt={`${displayName} default sprite`}
                width={96}
                height={96}
              />
            )}
            {pokemon.spriteVariants.shiny && (
              <Image
                src={pokemon.spriteVariants.shiny}
                alt={`${displayName} shiny sprite`}
                width={96}
                height={96}
              />
            )}
          </div>
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroMeta}>
            <span className={styles.identifier}>{formatPokemonId(pokemon.id)}</span>
            <span
              className={styles.generationPill}
              style={{ backgroundColor: `${accent}22`, color: accent ? "#fefce8" : undefined }}
            >
              {pokemon.generation ? formatGenerationName(pokemon.generation) : "Unknown generation"}
            </span>
          </div>
          <h1 className={styles.title}>{displayName}</h1>
          <p className={styles.flavor}>{pokemon.flavorText || `${displayName} awaits your discovery.`}</p>

          <div className={styles.typeList}>
            {pokemon.types.map((type) => (
              <span key={type} className={styles.typePill} style={{ backgroundColor: getTypeColor(type) }}>
                {humanize(type)}
              </span>
            ))}
          </div>

          <dl className={styles.quickFacts}>
            <div>
              <dt>Height</dt>
              <dd>{formatHeight(pokemon.height)}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatWeight(pokemon.weight)}</dd>
            </div>
            <div>
              <dt>Base Experience</dt>
              <dd>{pokemon.baseExperience}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {pokemon.isLegendary ? "Legendary" : pokemon.isMythical ? "Mythical" : "Standard"}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <section className={styles.contentGrid}>
        <article className={styles.panel} aria-labelledby="stats-heading">
          <div className={styles.panelHeader}>
            <h2 id="stats-heading">Base stats</h2>
            <span className={styles.statTotal}>Total: {statTotal}</span>
          </div>
          <ul className={styles.statList}>
            {pokemon.stats.map((stat) => (
              <li key={stat.name}>
                <span className={styles.statLabel}>{humanize(stat.name)}</span>
                <div className={styles.statBar} role="img" aria-label={`${humanize(stat.name)}: ${stat.value}`}>
                  <div
                    className={styles.statBarFill}
                    style={{
                      width: `${Math.min(stat.value / 180, 1) * 100}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
                <span className={styles.statValue}>{stat.value}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel} aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul className={styles.abilityList}>
            {pokemon.abilities.map((ability) => (
              <li key={ability.name}>
                <span className={styles.abilityName}>{humanize(ability.name)}</span>
                {ability.hidden && <span className={styles.hiddenBadge}>Hidden ability</span>}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel} aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>
          <p className={styles.panelHint}>
            Showing {combinedMoves.length} featured moves. Level-up moves are prioritised, followed by
            notable moves learned through other methods.
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.movesTable}>
              <caption className={styles.visuallyHidden}>{displayName} move list</caption>
              <thead>
                <tr>
                  <th scope="col">Move</th>
                  <th scope="col">Method</th>
                  <th scope="col">Level</th>
                </tr>
              </thead>
              <tbody>
                {combinedMoves.map((move) => (
                  <tr key={`${move.name}-${move.method}-${move.levelLearnedAt}`}>
                    <td>{humanize(move.name)}</td>
                    <td>{humanize(move.method)}</td>
                    <td>{move.levelLearnedAt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.panel} aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution chain</h2>
          {evolutionStages.length === 0 ? (
            <p className={styles.panelHint}>This Pokémon does not evolve.</p>
          ) : (
            <div className={styles.evolutionFlow}>
              {evolutionStages.map((stage, index) => (
                <div key={index} className={styles.evolutionColumn}>
                  <span className={styles.stageLabel}>Stage {index + 1}</span>
                  <ul>
                    {stage.map((node) => (
                      <li key={`${node.name}-${node.stage}`}>
                        {node.name ? (
                          <Link href={`/pokemon/${node.name}`} className={styles.evolutionLink}>
                            <span>{humanize(node.name)}</span>
                            {node.id && <span className={styles.evolutionId}>{formatPokemonId(node.id)}</span>}
                          </Link>
                        ) : (
                          <span>{humanize(node.name)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel} aria-labelledby="locations-heading">
          <h2 id="locations-heading">Where to find {displayName}</h2>
          {pokemon.locations.length === 0 ? (
            <p className={styles.panelHint}>Location data is not available for this Pokémon.</p>
          ) : (
            <ul className={styles.locationList}>
              {pokemon.locations.map((location) => (
                <li key={location}>{humanize(location)}</li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
