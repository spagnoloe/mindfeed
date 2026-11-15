import { ScrollView } from 'react-native';

import { ScreenTitle } from '@/design/headings';
import { tabScreenContent } from '@/navigation/tabScreenContent';

export default function ExploreScreen() {
  return (
    <ScrollView contentContainerStyle={tabScreenContent} showsVerticalScrollIndicator={false}>
      <ScreenTitle>explore.</ScreenTitle>
    </ScrollView>
  );
}
