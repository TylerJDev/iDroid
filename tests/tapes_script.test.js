const plugin = require('./tapes_script.js');
const data = require('./data.js');

// Test parsing of correct sections
describe('Parse specific sections', () => {
  // 1. Test grabbing "start at" heading
  test('Grab all content after section', () => {
    expect(plugin.parseHTMLData(data['data'])['start_section'].nodeName).toBe('H2');
    expect(plugin.parseHTMLData(data['data'])['elements_from_start'].filter(currEle => currEle.nodeName === 'H3').length).toBe(81);
  });

  // 2. Test Tree Structure
  test('Ensure tree structure contains the correct data', () => {
    expect(Object.keys(plugin.parseHTMLData(data['data'])['tree_structure']['parentTopic']).length).toBe(81);

    const newData =
    `<h2>Info Tapes</h2> +
    <h3><span class="mw-headline" id="Ocelot.27s_Briefing_.5B1.5D">Ocelot's Briefing [1]</span><span class="editsection"><a href="/wiki/Metal_Gear_Solid_V:_The_Phantom_Pain_cassette_transcripts?action=edit&amp;section=96" title="Edit Ocelot&#039;s Briefing [1] section">Edit</a></span></h3> +
    <h4><span class="mw-headline" id="British_Sovereign_Base_Area_-_Dhekelia"><i>British Sovereign Base Area - Dhekelia</i></span><span class="editsection"><a href="/wiki/Metal_Gear_Solid_V:_The_Phantom_Pain_cassette_transcripts?action=edit&amp;section=97" title="Edit British Sovereign Base Area - Dhekelia section">Edit</a></span></h4> +
    <p><b>Ocelot:</b> You were hospitalized in Dhekelia, a British Sovereign Base Area on Cyprus. It's part of British Overseas Territory that falls outside of Cypriot jurisdiction. You got moved from Cuba's Little America right into Cyprus' Little Britain.</p>`;

    // Expect only 1, due to only one <h4> being present within newData
    expect(Object.keys(plugin.parseHTMLData(newData)['tree_structure']['parentTopic']).length).toBe(1);
  });

  test('Ensure ease-of-access to tree structure', () => {
    expect(plugin.parseHTMLData(data['data'])['tree_structure']['parentTopic']['The Hamburgers of Kazuhira Miller [2]']['Kazuhira Miller\'s Research'][0][0]['Code Talker:']).toBe("I hope you brought a better hamburger this time, Kazuhira.");
    expect(plugin.parseHTMLData(data['data'])['tree_structure']['parentTopic']['Truth Records']['Doublethink'][0][0]['Ocelot:']).toBe("Boss. How are you back on your feet so quickly?");
  });
});
