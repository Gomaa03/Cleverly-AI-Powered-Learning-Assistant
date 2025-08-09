const handleAction = async (type) => {
  setResultType(type);
  setStage('results');
  setLoading(true);
  try {
    const data = await handleFileUpload(file);

    if (type === "flashcards") {
      setResults(prev => ({
        ...prev,
        flashcards: { flashcards: data.topics.flatMap(t => t.flashcards) }
      }));
    } else if (type === "quiz") {
      setResults(prev => ({
        ...prev,
        quiz: { quiz: data.topics.flatMap(t => t.quiz) }
      }));
    } else if (type === "summary") {
      setResults(prev => ({
        ...prev,
        summary: { summary: data.overall_summary }
      }));
    }
  } catch (err) {
    alert("Error: " + err.message);
    setStage('choose');
  } finally {
    setLoading(false);
  }
};
