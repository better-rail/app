import { stations } from "./stations"

export const startButton = "conductor:start"
export const skipButton = "conductor:skip"
export const clearButton = "conductor:clear"
export const selectPrefix = "conductor:station:"
export const platforms = [
  { id: "ios", name: "ios", label: "iOS", emoji: "🍎" },
  { id: "android", name: "android", label: "Android", emoji: "🤖" },
]

export function welcomeMessage() {
  return {
    content:
      "## All aboard! 🚂\nWelcome to Better Rail. I'm The Conductor—let's get you settled in.\n\n**1.** Choose iOS or Android.\n**2.** Pick your favorite station, or skip it for now.\n\nYour choices appear as roles on your server profile. You can change your ticket anytime.",
    allowed_mentions: { parse: [] },
    components: [
      {
        type: 1,
        components: [{ type: 2, style: 1, label: "Start your journey", emoji: { name: "🎟️" }, custom_id: startButton }],
      },
    ],
  }
}

export function platformPicker() {
  return {
    content: "## 1 / 2 · What are you riding with?\nChoose **iOS** or **Android** to continue.",
    allowed_mentions: { parse: [] },
    components: [
      {
        type: 1,
        components: platforms.map((platform) => ({
          type: 2,
          style: 1,
          label: platform.label,
          emoji: { name: platform.emoji },
          custom_id: `conductor:platform:${platform.id}`,
        })),
      },
    ],
  }
}

export function stationPicker(platformLabel: string) {
  const groups = []
  for (let start = 0; start < stations.length; start += 25) {
    const group = stations.slice(start, start + 25)
    groups.push({
      type: 1,
      components: [
        {
          type: 3,
          custom_id: `${selectPrefix}${start / 25}`,
          placeholder: `${group[0].name} → ${group[group.length - 1].name}`,
          min_values: 1,
          max_values: 1,
          options: group.map((station) => ({ label: station.name, value: station.id, description: station.hebrew })),
        },
      ],
    })
  }
  return {
    content: `## 2 / 2 · What's your favorite station?\n${platformLabel}—got it! Pick a station below to wear its name on your profile.\n\nThis stop is **optional**. You can skip it and choose later.`,
    allowed_mentions: { parse: [] },
    components: [
      ...groups,
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: "Skip for now", custom_id: skipButton },
          { type: 2, style: 2, label: "Change device", custom_id: startButton },
        ],
      },
    ],
  }
}

export function journeyComplete(platformLabel: string, stationName?: string, skipped = false) {
  return {
    content: `## Welcome aboard! 🚂\n**Device:** ${platformLabel}\n${stationName ? `**Station:** ${stationName}` : skipped ? "Station step skipped—you can change your station anytime." : "Station flair removed."}\n\nYou're all set. Say hello in <#1548778257866817626>!`,
    allowed_mentions: { parse: [] },
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: "Change my choices", custom_id: startButton },
          ...(stationName ? [{ type: 2, style: 2, label: "Remove station flair", custom_id: clearButton }] : []),
        ],
      },
    ],
  }
}
