function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(left, right) {
  let previousPrevious = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );
  let previous = [...previousPrevious];

  for (let row = 1; row <= left.length; row += 1) {
    const current = Array(right.length + 1);
    current[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost =
        left[row - 1] === right[column - 1] ? 0 : 1;

      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        current[column] = Math.min(
          current[column],
          previousPrevious[column - 2] + 1
        );
      }
    }

    previousPrevious = previous;
    previous = current;
  }

  return previous[right.length];
}

function maximumEditDistance(term) {
  if (term.length < 3) {
    return 0;
  }
  if (term.length <= 5) {
    return 1;
  }
  if (term.length <= 9) {
    return 2;
  }
  return Math.min(3, Math.floor(term.length * 0.25));
}

function bestTermMatch(term, listing) {
  const fields = [
    { value: listing.location, weight: 4 },
    { value: listing.title, weight: 3 },
    { value: listing.country, weight: 2 },
    { value: listing.description, weight: 1 },
  ];
  let best = null;

  for (const field of fields) {
    const words = normalize(field.value).split(" ").filter(Boolean);

    for (const word of words) {
      let distance = editDistance(term, word);
      if (word.includes(term)) {
        distance = 0;
      } else if (term.includes(word) && word.length >= 3) {
        distance = 1;
      }

      const limit = maximumEditDistance(term);
      if (distance > limit) {
        continue;
      }

      const score = field.weight * (1 - distance / (term.length + 1));
      if (!best || score > best.score) {
        best = { score, distance };
      }
    }
  }

  return best;
}

function rankListings(query, listings) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0 || terms.some((term) => term.length < 3)) {
    return [];
  }

  return listings
    .map((listing, index) => {
      const matches = terms.map((term) => bestTermMatch(term, listing));
      if (matches.some((match) => !match)) {
        return null;
      }

      return {
        listing,
        index,
        score: matches.reduce((total, match) => total + match.score, 0),
        distance: matches.reduce((total, match) => total + match.distance, 0),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.distance - right.distance ||
        left.index - right.index
    )
    .map((match) => match.listing);
}

module.exports = { rankListings };
