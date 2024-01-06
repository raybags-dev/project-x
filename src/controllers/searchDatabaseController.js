import { REVIEW } from '../models/documentModel.js'
import { checkAndUpdateDocumentUrls } from '../../middleware/bd_worker.js'

export async function SearchUserDocsController (req, res) {
const { searchQuery } = req.body
const { _id: userId, isAdmin } = req.user


  let query, count

  if (!searchQuery) {
    return res.status(400).json('Search query is required.')
  }

  if (isAdmin) {
    query = REVIEW.find({ $text: { $search: searchQuery } }, { token: 0 }).sort(
      { createdAt: -1 }
    )
    count = await REVIEW.countDocuments({
      $text: { $search: searchQuery }
    })
  } else {
    query = REVIEW.find(
      { user: userId, $text: { $search: searchQuery } },
      { token: 0 }
    ).sort({ createdAt: -1 })
    count = await REVIEW.countDocuments({
      user: userId,
      $text: { $search: searchQuery }
    })
  }

  const response = await query

  if (response.length === 0) return res.status(404).json('Nothing found!')

  const updatedDoc = await checkAndUpdateDocumentUrls(response)
  res.status(200).json({ count, documents: updatedDoc })
}
