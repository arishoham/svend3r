// import area from '$lib/charts/db/area';
// /** @type {import('@sveltejs/kit').RequestHandler} */
// export function get({ params }) {
//   return {
//     body: area
//   } 
// }

import area from '$lib/charts/db/area.json';
import chord from '$lib/charts/db/chord.json';
/** @type {import('@sveltejs/kit').RequestHandler} */
// export async function get({ params }) {
// 	const chart = await fetch(``);

// 	return {
// 		body: {
// 			prev,
// 			next,
// 			section: {
// 				file: section.file,
// 				title: section.title,
// 				content: section.content
// 			}
// 		}
// 	};
// }
export function get({ params }) {
  // console.log('slug.json', params.slug);
  const charts = {
    area: area,
    chord: chord
  }
  return {
    body: charts[params.slug]
  } 
}