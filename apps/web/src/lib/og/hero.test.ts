import { describe, expect, test } from "bun:test"
import { escapeXml, heroSvg, type HeroContent, type Measure } from "./hero"

/** Stands in for the renderer: a fixed advance per character. */
const measure: Measure = (text, size) => text.length * size * 0.55

const fontSizes = (svg: string) => [...svg.matchAll(/font-size="([\d.]+)"/g)].map((match) => Number(match[1]))
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])

const base: HeroContent = {
  locale: "he",
  origin: "חדרה - מערב",
  destination: "תל אביב - אוניברסיטה",
  tagline: "זמני רכבת, רציפים ועיכובים בזמן אמת",
  photo: "data:image/jpeg;base64,AAAA",
}

describe("heroSvg", () => {
  test("route: the names on two lines over the photo, read from the right in Hebrew", () => {
    const svg = heroSvg(base, measure)
    expect(svg).toContain('<image href="data:image/jpeg;base64,AAAA"')
    expect(svg).not.toContain("url(#brand)")
    expect(texts(svg)).toEqual(["Better Rail", "‏חדרה - מערב", "‏תל אביב - אוניברסיטה", "‏זמני רכבת, רציפים ועיכובים בזמן אמת"])
    // Hebrew lines hang off the right edge; the arrow, pointing left, leads the second line and the destination follows it.
    expect(svg).toContain(
      '<text x="1136" y="414.3" font-family="Heebo" font-weight="700" font-size="76" fill="#fff" text-anchor="end">‏חדרה - מערב<',
    )
    expect(svg).toContain('<path d="M19 12H5M12 19l-7-7 7-7" transform="translate(1075.2 446.2) scale(2.5)"')
    expect(svg).toContain(
      '<text x="1052.4" y="504" font-family="Heebo" font-weight="700" font-size="76" fill="#fff" text-anchor="end">‏תל אביב - אוניברסיטה<',
    )
    expect(svg).not.toContain('d="M5 12h14M12 5l7 7-7 7"')
  })

  test("route: English reads from the left without bidi marks", () => {
    const svg = heroSvg({ ...base, locale: "en", origin: "Hadera - West", destination: "Tel Aviv - University" }, measure)
    expect(texts(svg)).toEqual(["Better Rail", "Hadera - West", "Tel Aviv - University", base.tagline])
    expect(svg).toContain(
      '<text x="64" y="414.3" font-family="Heebo" font-weight="700" font-size="76" fill="#fff" text-anchor="start">Hadera - West<',
    )
    expect(svg).toContain('<path d="M5 12h14M12 5l7 7-7 7" transform="translate(64 446.2) scale(2.5)"')
    expect(svg).toContain(
      '<text x="147.6" y="504" font-family="Heebo" font-weight="700" font-size="76" fill="#fff" text-anchor="start">Tel Aviv - University<',
    )
    expect(svg).not.toContain("‏")
  })

  test("route: long names shrink until both lines fit, but no further than the floor", () => {
    const svg = heroSvg(
      { ...base, locale: "en", origin: "Be'er Sheva - North/University", destination: "Rishon LeTsiyon - Moshe Dayan" },
      measure,
    )
    const sizes = fontSizes(svg).filter((size) => size > 30)
    // 1072px of room; the second line, which also holds the arrow and a gap, is the one that binds.
    expect(sizes).toEqual([62, 62])
    const tiny = heroSvg({ ...base, origin: "x".repeat(200), destination: "y" }, measure)
    expect(Math.min(...fontSizes(tiny).filter((size) => size > 30))).toBe(40)
  })

  test("trip: the times, the route and the facts", () => {
    const svg = heroSvg(
      {
        ...base,
        trip: { departure: "20:56", arrival: "21:25", facts: "29 דק׳ · החלפה אחת · רציף 2" },
      },
      measure,
    )
    expect(texts(svg)).toEqual([
      "Better Rail",
      "‏20:56",
      "‏21:25",
      "‏חדרה - מערב",
      "‏תל אביב - אוניברסיטה",
      "‏29 דק׳ · החלפה אחת · רציף 2",
    ])
    expect(fontSizes(svg)).toEqual([28, 96, 96, 40, 40, 30])
    // Departure at the right edge, arrival past the arrow to its left.
    expect(svg).toContain(
      '<text x="1136" y="456" font-family="Heebo" font-weight="700" font-size="96" fill="#fff" text-anchor="end">‏20:56',
    )
    expect(svg).toContain('<path d="M19 12H5M12 19l-7-7 7-7" transform="translate(766.4 383) scale(3.2)"')
    expect(svg).toContain(
      '<text x="737.6" y="456" font-family="Heebo" font-weight="700" font-size="96" fill="#fff" text-anchor="end">‏21:25',
    )
  })

  test("trip: a long route line shrinks on its own; the times keep their size", () => {
    const svg = heroSvg(
      {
        ...base,
        locale: "en",
        origin: "Be'er Sheva - North/University",
        destination: "Rishon LeTsiyon - Moshe Dayan",
        trip: { departure: "06:12", arrival: "07:40", facts: "1h 28m · 2 changes" },
      },
      measure,
    )
    expect(fontSizes(svg)).toEqual([28, 96, 96, 31, 31, 30])
    expect(svg).toContain("Be&#39;er Sheva - North/University")
  })

  test("no photo: the brand gradient stands in", () => {
    const svg = heroSvg({ ...base, photo: undefined }, measure)
    expect(svg).not.toContain("<image")
    expect(svg).toContain('fill="url(#brand)"')
  })

  test("escapeXml", () => {
    expect(escapeXml(`Bet Yehoshu'a & "co" <b>`)).toBe("Bet Yehoshu&#39;a &amp; &quot;co&quot; &lt;b&gt;")
  })
})
