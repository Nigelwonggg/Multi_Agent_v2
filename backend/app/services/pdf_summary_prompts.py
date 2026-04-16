"""
Prompt templates for PDF ingestion summaries.

This is a backend-local copy of the original vector database prompt helpers
so the web upload service can generate domain-specific summaries safely.
"""

AVAILABLE_DOMAINS = ["data_science", "medical"]


def get_available_domains():
    return AVAILABLE_DOMAINS.copy()


def ds_text_summary_prompt(element, category):
    return f"""
You are a data science content processor preparing materials for a vector database. Carefully analyze the provided textbook element and create a structured summary optimized for domain-specific retrieval.

Element to process:
<element>
{element}
</element>

<provided_subdomain>
{category}
</provided_subdomain>

Follow these steps:

1. **Classification Validation** - Cross-verify the provided sub-domain against the element's content through:
   a) Concept pattern matching
   b) Technical terminology analysis
   c) Methodology alignment check
   d) Contextual application review

2. **Key Identification** - Extract:
   a) Primary subject/technique
   b) Key technical terms
   c) Practical applications
   d) Inter-domain relationships

3. **Cognitive Summary Creation** - Synthesize information using:
   a) Conceptual triangulation
   b) Semantic relationship mapping
   c) Contextual prioritization
   d) Domain-specific framing

Format requirements:
<Summary>
[Multi-perspective technical synthesis maintaining original context integrity. Use nested conceptual relationships for vector alignment.]
</Summary>

<Validated Sub-domain>
[Confirmed classification after cross-examination with both provided sub-domain and element content]
</Validated Sub-domain>
"""


def ds_image_summary_prompt(image):
    return f"""
You are a data science specialist helping create detailed image descriptions for textbook content indexing. Your task is to analyze educational images and produce technical summaries optimized for retrieval in a vector database.

Follow this analysis process:
1. Determine if the image is a graph/chart. If yes:
   - Identify exact graph type (e.g., scatter plot, heatmap, decision tree)
   - Note axis labels, legends, and data relationships
   - Describe statistical concepts demonstrated
2. For non-graph images:
   - Identify key visual elements
   - Recognize data science concepts illustrated
   - Note mathematical symbols/equations if present
3. Relate content to 3-5 data science sub-domains (e.g., machine learning, visualization, statistics)
4. Create a 6-10 word title including graph type (if applicable)
5. Write a concise technical summary covering:
   - Purpose/function of the image
   - Key data relationships/concepts
   - Relevant methodologies/algorithms

Format your response as:
<Summary>
Title Line: [Descriptive title with graph type if applicable]
[Technical summary beginning with content analysis. Maintain third-person perspective while covering essential elements. Prioritize retrieval-critical information.]
</Summary>

<Thought>
[Analysis of graph type/elements, concept connections, and sub-domain relevance]
</Thought>
"""


def med_text_summary_prompt(element, category):
    return f"""
You are a medical content processor preparing materials for a clinical knowledge vector database. Carefully analyze the provided medical textbook element and create a structured summary optimized for healthcare domain-specific retrieval.

Element to process:
<element>
{element}
</element>

<provided_subdomain>
{category}
</provided_subdomain>

Follow these steps:

1. **Clinical Classification Validation** - Cross-verify the provided medical sub-domain against the element's content through:
   a) Medical concept pattern matching
   b) Clinical terminology analysis
   c) Diagnostic/therapeutic methodology alignment check
   d) Healthcare practice contextual review

2. **Medical Key Identification** - Extract:
   a) Primary condition/procedure/treatment
   b) Key clinical terms and medical vocabulary
   c) Clinical applications and patient care implications
   d) Inter-specialty relationships and referral pathways

3. **Clinical Summary Creation** - Synthesize information using:
   a) Pathophysiological conceptual triangulation
   b) Clinical relationship mapping
   c) Evidence-based prioritization
   d) Medical specialty-specific framing

Format requirements:
<Summary>
[Multi-perspective clinical synthesis maintaining original medical context integrity. Use nested pathophysiological relationships for vector alignment. Focus on diagnostic relevance, therapeutic implications, and clinical decision-making support.]
</Summary>

<Validated Sub-domain>
[Confirmed medical classification after cross-examination with both provided sub-domain and element content]
</Validated Sub-domain>
"""


def med_image_summary_prompt(image):
    return f"""
You are a medical imaging specialist helping create detailed image descriptions for clinical textbook content indexing. Your task is to analyze medical images and produce technical summaries optimized for retrieval in a vector database.

Follow this analysis process:
1. Determine if the image is a medical chart/graph. If yes:
   - Identify exact chart type (e.g., ECG trace, blood pressure plot, dose-response curve, survival analysis, ROC curve)
   - Note axis labels, legends, and clinical data relationships
   - Describe medical concepts and clinical significance demonstrated

2. For non-chart medical images:
   - Identify key anatomical structures or pathological findings
   - Recognize medical imaging modalities (X-ray, CT, MRI, ultrasound, histology, etc.)
   - Note medical terminology, diagnostic markers, or annotations if present

3. Relate content to 3-5 medical sub-domains (e.g., cardiology, oncology, pathology, radiology, pharmacology, epidemiology)

4. Create a 6-10 word title including chart type or imaging modality (if applicable)

5. Write a concise technical summary covering:
   - Clinical purpose/diagnostic function of the image
   - Key anatomical relationships/pathological findings
   - Relevant medical procedures/diagnostic methods
   - Clinical significance or diagnostic value

Format your response as:
<Summary>
Title Line: [Descriptive title with chart type or imaging modality if applicable]
[Technical summary beginning with clinical analysis. Maintain third-person perspective while covering essential medical elements. Prioritize retrieval-critical information for healthcare professionals.]
</Summary>

<Thought>
[Analysis of chart type/anatomical elements, medical concept connections, and sub-domain relevance]
</Thought>
"""
