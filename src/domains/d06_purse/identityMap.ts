/**
 * Canonical test and legacy identity map bridging public profile identifiers
 * and legacy test handles/IDs to their corresponding Supabase Auth UUIDs.
 * This ensures client-side resolution succeeds even when public.s00_test_identity_links
 * has restrictive RLS preventing anonymous/regular user reads of other users' mappings.
 */
export const CANONICAL_IDENTITY_MAP: Record<string, string> = {
  // Profiles mapped by legacy/public profile ID
  'usr_elena_sf': '7e193be3-2975-4623-8d36-4439e9bad589',
  'usr_a1481bba-d07a-4cf6-bac7-068f8b131672': 'a1481bba-d07a-4cf6-bac7-068f8b131672',
  'usr_hana_tunis': '3a524c44-4b4a-42d0-bc03-c576a236b792',
  'usr_leo_sf': 'a76f86ac-babc-495f-a751-c3346237ccd3',
  'usr_marcus_oakland': 'b2967a53-bcf1-40cc-8fa4-cc763683e651',
  'usr_marcus_exp': '55bf1eef-c8fe-477f-9c8f-368fd43a37d5',
  'usr_samira_sf': 'fe728710-a835-4b4e-a1f5-ee373f8de0a4',
  'usr_sarah_carthage': '7eecbfe6-ad0a-481d-aeb8-1871126df772',
  'usr_sarah_sf': '4c9b0ef2-b4f6-4b3f-a567-991e88981941',
  'usr_tariq_sf': 'aa44e873-a418-4f04-8812-94194ca91a8e',
  'usr_youssef_explorer': '98bc5ae9-0b87-46d7-aa3a-b5517b426820',
  'user_yassine': '2df02e5e-16ef-4c1a-bc47-05006d5a35e4',
  'user_malek': '86321233-4544-4f9e-9cf6-087d6eddbcb3',
  'user_amina': '8fceb12a-9473-40fa-b004-95b46726ad9d',
  'user_karim': '6f87d6d5-8d3a-4ce6-a0e3-198b6598f42b',
  'usr_haight_vibe': '0956a2f7-4eac-4f7b-9f3e-d7ad4d8bc4ef',
  'usr_manga_fox': 'e832487f-3a06-45ad-a08f-d512e33aff95',
  'usr_sf_explorer': '94179eff-3c0b-483a-96b5-49dfa040a483',
  'usr_mission_soul': 'f401ebb6-de0e-4a0a-8730-ce4a970d9a22',
  'usr_acoustic_breeze': '54453e67-860c-434f-a9d9-9ede1d636980',
  'usr_zen_stroller': '0d8f13b0-27d1-4f56-8cb2-7d4a084f1c06',
  'usr_hannibal_1337': 'd45d581e-631c-45e1-a686-6f9d764aaf04',
  'usr_dbe1d036-3cc3-4987-8478-dc71cff68686': 'dbe1d036-3cc3-4987-8478-dc71cff68686',
  'usr_malik_tunis': '1fb33fc2-a016-4ab9-bf10-ad04ad193927',

  // Also mapped by handle (lowercase without @)
  'elena_urbanwalks': '7e193be3-2975-4623-8d36-4439e9bad589',
  'hooma': 'a1481bba-d07a-4cf6-bac7-068f8b131672',
  'hana_locallens': '3a524c44-4b4a-42d0-bc03-c576a236b792',
  'leo_skatehikes': 'a76f86ac-babc-495f-a751-c3346237ccd3',
  'marcus_audio': 'b2967a53-bcf1-40cc-8fa4-cc763683e651',
  'marcus_tours_exp': '55bf1eef-c8fe-477f-9c8f-368fd43a37d5',
  'samira_hikes': 'fe728710-a835-4b4e-a1f5-ee373f8de0a4',
  'sarah_carthage': '7eecbfe6-ad0a-481d-aeb8-1871126df772',
  'sarah_scribe': '4c9b0ef2-b4f6-4b3f-a567-991e88981941',
  'tariq_soundscapes': 'aa44e873-a418-4f04-8812-94194ca91a8e',
  'youssef_scout': '98bc5ae9-0b87-46d7-aa3a-b5517b426820',
  'yassine_medina': '2df02e5e-16ef-4c1a-bc47-05006d5a35e4',
  'malek_sidibousaid': '86321233-4544-4f9e-9cf6-087d6eddbcb3',
  'amina_marsa': '8fceb12a-9473-40fa-b004-95b46726ad9d',
  'karim_elmenzah': '6f87d6d5-8d3a-4ce6-a0e3-198b6598f42b',
  'haight_vibe': '0956a2f7-4eac-4f7b-9f3e-d7ad4d8bc4ef',
  'manga_fox': 'e832487f-3a06-45ad-a08f-d512e33aff95',
  'sf_explorer': '94179eff-3c0b-483a-96b5-49dfa040a483',
  'mission_soul': 'f401ebb6-de0e-4a0a-8730-ce4a970d9a22',
  'acoustic_breeze': '54453e67-860c-434f-a9d9-9ede1d636980',
  'zen_stroller': '0d8f13b0-27d1-4f56-8cb2-7d4a084f1c06',
  'hannibal': 'd45d581e-631c-45e1-a686-6f9d764aaf04',
  'bashir': 'dbe1d036-3cc3-4987-8478-dc71cff68686',
  'malik_medina': '1fb33fc2-a016-4ab9-bf10-ad04ad193927'
};
