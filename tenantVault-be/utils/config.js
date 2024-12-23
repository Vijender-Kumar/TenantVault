// const midJourneyPostConfig = (apiUrl, keyValue, payload) => {
//     const config_data = {
//         url: apiUrl,
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${keyValue}`,
//         },
//         data: JSON.parse(JSON.stringify(payload))
//     }
//     return config_data;
// }

// const midJourneyGetConfig = (apiUrl, keyValue) => {
//     return {
//         url: apiUrl,
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${keyValue}`,
//         },
//     }
// }

// module.exports = {
//     midJourneyPostConfig,
//     midJourneyGetConfig,
// }
