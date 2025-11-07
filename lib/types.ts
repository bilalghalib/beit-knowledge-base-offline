export interface Insight {
  id: string;
  insight_id?: string;
  expert: string;
  date?: string;
  module: string;
  timestamp?: string;
  time_marker?: string;
  theme_english: string;
  theme_arabic: string;
  quote_english: string;
  quote_arabic: string;
  tags_english?: string;
  tags_arabic?: string;
  insight_type?: string;
  priority?: string;
  context_english?: string;
  context_arabic?: string;
  output_relevance?: string;
  embedding?: number[];
  similarity?: number;
}
