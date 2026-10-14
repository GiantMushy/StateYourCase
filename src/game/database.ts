// Loads topics and corruptions from the bundled CSVs (same files the Unity build reads).
import topicsCsv from '../data/Topics.csv?raw'
import corruptionsCsv from '../data/Corruptions.csv?raw'
import { field, parseCsv } from './csv'
import type { Corruption, CorruptionType, Pack, Topic, TopicType } from './types'

const PACKS: Record<string, Pack> = {
  General: 'Default',
  Icelandic: 'Icelandic',
  EighteenPlus: 'EighteenPlus',
  Political: 'Political',
  PopCulture: 'PopCulture',
}
const TOPIC_TYPES: Record<string, TopicType> = { 'This or That': 'Versus', Scenarios: 'Scenarios' }
const CORRUPTION_TYPES: Record<string, CorruptionType> = {
  Speech: 'Speech',
  Interruption: 'Interruption',
  Betrayal: 'Betrayal',
}

const isTrue = (s: string) => s.toUpperCase() === 'TRUE'

/** Columns: 0=id 1=Ready 2=Pack 3=Length 4=Desc EN 5=Desc IS 6=This 7=That 8=Hitt 9=Þetta */
export function loadTopics(text: string = topicsCsv): Topic[] {
  const topics: Topic[] = []
  let nextId = 0
  for (const f of parseCsv(text)) {
    if (f.length < 4 || field(f, 0) === 'id') continue
    if (!isTrue(field(f, 1))) continue
    const pack = PACKS[field(f, 2)]
    const type = TOPIC_TYPES[field(f, 3)]
    const description = field(f, 4)
    if (!description || !pack || !type) continue
    const parsed = parseInt(field(f, 0), 10)
    const id = Number.isNaN(parsed) ? nextId : parsed
    nextId = id + 1
    topics.push({
      id,
      pack,
      type,
      description,
      descriptionIs: field(f, 5),
      optionA: field(f, 6),
      optionB: field(f, 7),
      optionAIs: field(f, 8),
      optionBIs: field(f, 9),
      seriousness: 2,
    })
  }
  return topics
}

/** Columns: 0=id 1=Ready 2=Requires Teammate 3=points 4=Pack 5=Type 6..8=EN title/desc/short 9..11=IS */
export function loadCorruptions(text: string = corruptionsCsv): Corruption[] {
  const list: Corruption[] = []
  let nextId = 0
  for (const f of parseCsv(text)) {
    if (f.length < 6) continue
    const first = field(f, 0)
    if (first === 'id' || first === 'Properties') continue
    if (!isTrue(field(f, 1))) continue
    const title = field(f, 6)
    const type = CORRUPTION_TYPES[field(f, 5)]
    if (!title || !type) continue
    let points = parseInt(field(f, 3), 10)
    if (Number.isNaN(points) || points <= 0) points = 60
    const parsed = parseInt(first, 10)
    const id = Number.isNaN(parsed) ? nextId : parsed
    nextId = id + 1
    const description = field(f, 7)
    list.push({
      id,
      type,
      points,
      title,
      titleIs: field(f, 9),
      description,
      descriptionIs: field(f, 10),
      shortDescription: field(f, 8),
      shortDescriptionIs: field(f, 11),
      requiresTeammate: isTrue(field(f, 2)),
      requiresZeroGroupVotes: type === 'Betrayal' && description.toLowerCase().includes('zero votes'),
    })
  }
  return list
}
