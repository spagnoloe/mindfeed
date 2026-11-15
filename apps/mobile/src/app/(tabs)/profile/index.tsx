import { ScrollView } from 'react-native';

import { ScreenTitle } from '@/design/headings';
import { tabScreenContent } from '@/navigation/tabScreenContent';

export default function ProfileScreen() {
  return (
    <ScrollView contentContainerStyle={tabScreenContent} showsVerticalScrollIndicator={false}>
      <ScreenTitle>profile.</ScreenTitle>
    </ScrollView>
  );
}
