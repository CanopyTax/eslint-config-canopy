/**
 * @fileoverview Rule to check for tabs inside a file
 * @author Joel Denning
 */

"use strict";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------
const regex = /^\s*[ ]{2,}\s*\S*/;

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = {
	meta: {
		docs: {
			description: "disallow indentation with spaces",
			category: "Stylistic Issues",
			recommended: false
		},
		schema: []
	},

	create(context) {
		return {
			Program(node) {
				context.getSourceCode().getLines().forEach((line, index) => {
					const match = regex.exec(line);

					if (match) {
						context.report({
							node,
							loc: {
								line: index + 1,
								column: match.index + 1
							},
							message: "Unexpected space character for indentation."
						});
					}
				});
			}
		};
	}
};
