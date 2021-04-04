import * as React from "react"
import { storiesOf } from "@storybook/react-native"
import { StoryScreen, Story, UseCase } from "../../../storybook/views"
import { color } from "../../theme"
import { StationCard } from "./station-card"

storiesOf("StationCard", module)
  .addDecorator((fn) => <StoryScreen>{fn()}</StoryScreen>)
  .add("Style Presets", () => (
    <Story>
      <UseCase text="Primary" usage="The primary." style={{ paddingHorizontal: 12 }}>
        <StationCard
          name="ירושלים - יצחק נבון"
          image={{
            uri:
              "https://upload.wikimedia.org/wikipedia/commons/9/98/%D7%AA%D7%97%D7%A0%D7%AA_%D7%91%D7%A0%D7%99%D7%99%D7%A0%D7%99_%D7%94%D7%90%D7%95%D7%9E%D7%94_-_1.jpg",
          }}
        />
      </UseCase>
    </Story>
  ))
