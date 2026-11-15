import { ScrollView } from 'react-native';

import { ScreenTitle } from '@/design/headings';
import { tabScreenContent } from '@/navigation/tabScreenContent';

export default function LibraryScreen() {
  return (
    <ScrollView contentContainerStyle={tabScreenContent} showsVerticalScrollIndicator={false}>
      <ScreenTitle>library.</ScreenTitle>
    </ScrollView>
  );
}
