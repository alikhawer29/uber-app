/**
 * Utility functions for building MongoDB search queries
 * Handles multi-word searches for firstName and lastName combinations
 */
export class SearchUtils {
    /**
     * Builds a MongoDB $or query for user search that handles:
     * - Single word: searches in firstName, lastName, email, phone
     * - Multiple words: searches for combinations like "Mark William" matching:
     *   - firstName="Mark" AND lastName="William"
     *   - firstName="William" AND lastName="Mark"
     *   - firstName contains "Mark William"
     *   - lastName contains "Mark William"
     *   - email/phone contains the search term
     */
    static buildUserSearchQuery(search: string): any[] {
        if (!search || typeof search !== 'string') {
            return [];
        }

        // Trim and normalize the search term
        const trimmedSearch = search.trim();
        if (!trimmedSearch) {
            return [];
        }

        // Escape special regex characters
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedSearch = escapeRegex(trimmedSearch);

        // Split by spaces and filter out empty strings
        const words = trimmedSearch.split(/\s+/).filter(word => word.length > 0);

        // If single word, search in all fields
        if (words.length === 1) {
            return [
                { email: { $regex: escapedSearch, $options: 'i' } },
                { firstName: { $regex: escapedSearch, $options: 'i' } },
                { lastName: { $regex: escapedSearch, $options: 'i' } },
                { phone: { $regex: escapedSearch, $options: 'i' } },
            ];
        }

        // Multiple words: build combinations
        const searchConditions: any[] = [];

        // Search email and phone with full term
        searchConditions.push(
            { email: { $regex: escapedSearch, $options: 'i' } },
            { phone: { $regex: escapedSearch, $options: 'i' } }
        );

        // Search firstName and lastName with full term
        searchConditions.push(
            { firstName: { $regex: escapedSearch, $options: 'i' } },
            { lastName: { $regex: escapedSearch, $options: 'i' } }
        );

        // For 2 words, try both combinations: firstName=word1 AND lastName=word2, or firstName=word2 AND lastName=word1
        if (words.length === 2) {
            const [word1, word2] = words.map(w => escapeRegex(w));
            searchConditions.push(
                {
                    $and: [
                        { firstName: { $regex: word1, $options: 'i' } },
                        { lastName: { $regex: word2, $options: 'i' } }
                    ]
                },
                {
                    $and: [
                        { firstName: { $regex: word2, $options: 'i' } },
                        { lastName: { $regex: word1, $options: 'i' } }
                    ]
                }
            );
        } else {
            // For 3+ words, try matching all words in firstName or all words in lastName
            // Also try first word in firstName and rest in lastName, etc.
            const escapedWords = words.map(w => escapeRegex(w));
            
            // All words in firstName
            searchConditions.push({
                firstName: { $regex: escapedWords.join('.*'), $options: 'i' }
            });

            // All words in lastName
            searchConditions.push({
                lastName: { $regex: escapedWords.join('.*'), $options: 'i' }
            });

            // First word in firstName, rest in lastName
            if (words.length > 1) {
                searchConditions.push({
                    $and: [
                        { firstName: { $regex: escapedWords[0], $options: 'i' } },
                        { lastName: { $regex: escapedWords.slice(1).join('.*'), $options: 'i' } }
                    ]
                });
            }

            // Last word in lastName, rest in firstName
            if (words.length > 1) {
                searchConditions.push({
                    $and: [
                        { firstName: { $regex: escapedWords.slice(0, -1).join('.*'), $options: 'i' } },
                        { lastName: { $regex: escapedWords[escapedWords.length - 1], $options: 'i' } }
                    ]
                });
            }
        }

        return searchConditions;
    }

    /**
     * Builds a MongoDB $or query for name search (firstName and lastName only)
     * Useful for sub-admin searches or other name-only searches
     */
    static buildNameSearchQuery(search: string): any[] {
        if (!search || typeof search !== 'string') {
            return [];
        }

        const trimmedSearch = search.trim();
        if (!trimmedSearch) {
            return [];
        }

        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedSearch = escapeRegex(trimmedSearch);
        const words = trimmedSearch.split(/\s+/).filter(word => word.length > 0);

        if (words.length === 1) {
            return [
                { firstName: { $regex: escapedSearch, $options: 'i' } },
                { lastName: { $regex: escapedSearch, $options: 'i' } },
            ];
        }

        const searchConditions: any[] = [
            { firstName: { $regex: escapedSearch, $options: 'i' } },
            { lastName: { $regex: escapedSearch, $options: 'i' } }
        ];

        if (words.length === 2) {
            const [word1, word2] = words.map(w => escapeRegex(w));
            searchConditions.push(
                {
                    $and: [
                        { firstName: { $regex: word1, $options: 'i' } },
                        { lastName: { $regex: word2, $options: 'i' } }
                    ]
                },
                {
                    $and: [
                        { firstName: { $regex: word2, $options: 'i' } },
                        { lastName: { $regex: word1, $options: 'i' } }
                    ]
                }
            );
        } else {
            const escapedWords = words.map(w => escapeRegex(w));
            searchConditions.push(
                { firstName: { $regex: escapedWords.join('.*'), $options: 'i' } },
                { lastName: { $regex: escapedWords.join('.*'), $options: 'i' } }
            );
        }

        return searchConditions;
    }

    /**
     * Filters users in memory by search term (for cases where we need to filter after fetching)
     * Handles multi-word searches for firstName and lastName
     */
    static filterUsersBySearch(users: any[], search: string): any[] {
        if (!search || typeof search !== 'string') {
            return users;
        }

        const trimmedSearch = search.trim().toLowerCase();
        if (!trimmedSearch) {
            return users;
        }

        const words = trimmedSearch.split(/\s+/).filter(word => word.length > 0);

        return users.filter(user => {
            const email = (user.email || '').toLowerCase();
            const firstName = (user.firstName || '').toLowerCase();
            const lastName = (user.lastName || '').toLowerCase();
            const phone = (user.phone || '').toLowerCase();

            // Single word search
            if (words.length === 1) {
                return email.includes(trimmedSearch) ||
                    firstName.includes(trimmedSearch) ||
                    lastName.includes(trimmedSearch) ||
                    phone.includes(trimmedSearch);
            }

            // Multi-word search
            const fullName = `${firstName} ${lastName}`.trim();
            const reverseFullName = `${lastName} ${firstName}`.trim();
            const searchTerm = words.join(' ');

            return email.includes(trimmedSearch) ||
                phone.includes(trimmedSearch) ||
                fullName.includes(searchTerm) ||
                reverseFullName.includes(searchTerm) ||
                firstName.includes(searchTerm) ||
                lastName.includes(searchTerm) ||
                (words.length === 2 && (
                    (firstName.includes(words[0]) && lastName.includes(words[1])) ||
                    (firstName.includes(words[1]) && lastName.includes(words[0]))
                ));
        });
    }
}

