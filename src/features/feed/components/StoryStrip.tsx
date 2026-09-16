import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedStory } from "../feed.schema";

const GRADIENT = "linear-gradient(135deg,#ff006e 0%,#8b00ff 100%)";

export function StoryStrip({ stories }: { stories: FeedStory[] }) {
  return (
    <div className="feed-stories">
      <div className="feed-stories-row">
        <motion.button whileTap={{ scale: 0.9 }} className="story-item" type="button">
          <div className="story-avatar your-story">
            <div className="story-avatar-inner fallback-avatar">Y</div>
            <span className="story-add" style={{ background: GRADIENT }}><Plus size={9} /></span>
          </div>
          <span>Your story</span>
        </motion.button>
        {stories.map((story) => (
          <motion.button key={story.id} whileTap={{ scale: 0.9 }} className="story-item" type="button">
            <div className={`story-avatar ${story.viewed ? "story-viewed" : "story-unviewed"}`}>
              <div className="story-avatar-inner"><img src={story.author.avatarUrl} alt="" /></div>
            </div>
            <span>{story.author.displayName.split(" ")[0]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
