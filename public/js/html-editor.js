$(document).ready(function () {

    let currentHtmlSectionId = 0;
    let currentHtmlSectionAnchor = '';
    let selectedText = '';
    let htmlSections = null;
    let selectedBlogPostIndex;
    let currentTab = $('#editorTab .nav-link.active')[0];
    
    $('button[data-bs-toggle="tab"]').on('show.bs.tab', function (event) {
        currentTab = event.target
        if (currentTab.id === 'code-tab') {
            let iframeSrc = `/users/htmlSections/editor/` + htmlSectionId;
            $('#viewHtmlSectionEditorFrame').attr('src', iframeSrc);
        } else if (currentTab.id === 'wysiwyg-tab') {
            
            const iframeWindow = $('#viewHtmlSectionEditorFrame')[0].contentWindow;
            $('#editableHtmlContent').html(iframeWindow.editor.getValue());
            $('#imageUploadInput').on('change', imageUpload);
        }


    });

    $('#buttonreplace').on('click', function (e) {
        $('#findAndReplaceForm').submit();
    });



    $('#edit-html').on('click', function () {
        const contentDiv = $('#editableHtmlContent');
        const isEditable = contentDiv.attr('contenteditable') === 'true';
        contentDiv.attr('contenteditable', !isEditable);
        $('#save-html').attr('disabled', isEditable);
    });


    $('#save-html').on('click', function () {
        try {
            const iframeWindow = $('#viewHtmlSectionEditorFrame')[0].contentWindow;
            const tab = $('#editorTab .nav-link.active')[0];
            const htmlSectionId = $("#HtmlSectionID").val();
            if (tab.id === 'code-tab') {

                if (typeof iframeWindow.saveCode === 'function') {
                    window.updatedHtml = iframeWindow.saveCode(htmlSectionId);

                }
            }
            else if (tab.id === 'wysiwyg-tab') {
                window.updatedHtml = $('#editableHtmlContent').html();
                $.ajax({
                    url: '/users/htmlSections/update',
                    method: 'POST',
                    data: {
                        HtmlSectionID: htmlSectionId,
                        Html: window.updatedHtml
                    },
                    success: function (response) {
                        if (response.success) {
                            
                        } else {
                            alert('Failed to save content.');
                        }

                    },
                    error: function (err) {
                        alert(JSON.stringify(err));
                    }
                });
            }
        } catch (e) {
            alert(JSON.stringify(e));
        }




    });

    $('#findAdReplaceBtn').on('click', function (e) {
        e.preventDefault();
        $('#findAndReplaceModal').modal('show');
    });


    $('#findAndReplaceForm').on('submit', function (e) {
        e.preventDefault();
        const find = $('#find-text').val();
        const replace = $('#replace-text').val();
        let blogPostId = null;

        if ($('#replace-all').is(':checked')) {
            blogPostId = null;
        } else {
            blogPostId = $('#blogPostIdFilter').val();
        }


        $.ajax({
            url: '/admin/htmlSections/findAndReplace',
            method: 'POST',
            data: {
                find: find,
                replace: replace,
                blogPostId: blogPostId
            },
            success: function (response) {
                if (response.success) {
                    $('#findAndReplaceModal').modal('hide');
                    alert(response.message)
                } else {
                    alert('Find And Replace Failed.');
                }
            },
            error: function (err) {
                alert(JSON.stringify(err));
            }
        });
    });


    $('#importHtmlSectionBtn').on('click', function () {

        const htmlSectionsFromDb = htmlSections;

        $.ajax({
            url: '/admin/htmlSections/importSingleHtmlSectionById/solid-foundation-knowledge-is-power-in-digital-marketing/2',
            method: 'GET',

            success: function (htmlSectionsFromFile) {

                if (htmlSectionsFromDb !== 'undefined' && htmlSectionsFromDb.length > 0) {
                    for (let i = 0; i < htmlSectionsFromFile.length; i++) {
                        const htmlSectionId = htmlSectionsFromDb[i].HtmlSectionID;
                        const dbAnchor = htmlSectionsFromDb[i].Anchor;
                        const [htmlContent, anchor] = htmlSectionsFromFile[i];
                        const blogPostId = $('#blogPostIdFilter').val();
                        if (dbAnchor === anchor) {

                            $.ajax({
                                url: '/admin/htmlSections/updateBySectionId',
                                method: 'POST',
                                data: {
                                    blogPostId,
                                    htmlSectionId,
                                    htmlContent
                                },
                                success: function (data) {
                                    console.log(JSON.stringify(data));
                                },
                                error: function (err) {
                                    console.log(JSON.stringify(err));
                                }
                            });
                        }
                    }

                }
                ///alert(JSON.stringify(data));
            },
            error: function (err) {
                alert(JSON.stringify(err));
            }
        });
    });

    $('#image-html').on('click', triggerImageUpload);

    $('.image-wrapper > img').on('click', triggerImageUpload);
    function triggerImageUpload() {
        const $input = $('#imageUploadInput');
        $('#imageUploadInput').on('change', imageUpload);
        $input.click();
    }
    function imageUpload() {
        try {


            var url = window.location.pathname;
            var anchor = url.split("/")['5'];

            const file = this.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('image', file);

                $.ajax({
                    url: '/admin/htmlSections/uploadImage',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response.success) {
                            const imageUrl = response.imageUrl;
                            const section = $('#' + anchor);
                            if (section.hasClass('header1')) {
                                section.attr('style', 'background-image: url("' + imageUrl + '")');
                            } else {
                                $('.image-wrapper > img').attr('src', imageUrl);
                            }

                        } else {
                            alert('Image upload failed.');
                        }
                    },
                    error: function (err) {
                        alert('An error occurred while uploading the image. ' + JSON.stringify(err));
                    }
                });
                this.files[0] = null;
            }
        } catch (err) {
            alert(JSON.stringify(err));
        }
    }
    $('#imageUploadInput').on('change', imageUpload);


    $(document).on('click', '.delete-btn', function () {
        const htmlSectionId = $(this).data('id');
        $('#confirmDeleteBtn').data('id', htmlSectionId);
        $('#confirmDeleteModal').modal('show');
    });

    $('#confirmDeleteBtn').on('click', function () {
        const htmlSectionId = $(this).data('id');
        $.post(`/admin/htmlSections/delete/${htmlSectionId}`, function (response) {
            if (response.success) {
                $('#confirmDeleteModal').modal('hide');
                fetchHtmlSections();
            }
        });
    });




    // Function to get the selected text
    function getSelectionText() {
        let text = '';
        if (window.getSelection) {
            text = window.getSelection().toString();
        } else if (document.selection && document.selection.type != 'Control') {
            text = document.selection.createRange().text;
        }
        return text;
    }

    // Event handler for the Insert Link button
    $('#insert-link').on('click', function () {
        selectedText = getSelectionText();
        if (selectedText.length > 0) {
            $('#linkText').val(selectedText);
            $('#insertLinkModal').modal('show');
        } else {
            alert('Please select the text you want to hyperlink.');
        }
    });

    // Event handler for the Insert Link button in the modal
    $('#insertLinkBtn').on('click', function () {
        const linkUrl = $('#linkUrl').val();
        const linkText = $('#linkText').val();

        if (linkUrl && linkText) {
            const anchorTag = `<a href="${linkUrl}" target="_blank">${linkText}</a>`;
            const contentDiv = $('#editableHtmlContent');
            const currentHtml = contentDiv.html();
            const newHtml = currentHtml.replace(linkText, anchorTag);
            contentDiv.html(newHtml);
            $('#insertLinkModal').modal('hide');
        } else {
            alert('Please enter the URL.');
        }
    });

    // Event handler for the Remove Link button
    $('#remove-link').on('click', function () {
        // Get the selected link
        const selectedElement = window.getSelection().anchorNode.parentNode;

        if (selectedElement.tagName === 'A') {
            // Remove the link while preserving the text
            const linkText = selectedElement.innerText;
            $(selectedElement).replaceWith(linkText);
        } else {
            alert('Please select a link to remove.');
        }
    });

    // Function to get the selected text node
    function getSelectedTextNode() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            return range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer : range.commonAncestorContainer.firstChild;
        }
        return null;
    }

    // Event handler for the Font Size button
    $('#font-size').on('click', function () {
        selectedText = getSelectedTextNode();
        if (selectedText) {
            $('#fontSizeModal').modal('show');
        } else {
            alert('Please select the text you want to change.');
        }
    });

    // Event handler for the Apply button in the Font Size modal
    $('#applyFontSize').on('click', function () {
        const fontSize = $('#fontSizeSelect').val();
        if (selectedText) {
            $(selectedText).css('font-size', fontSize);
            $('#fontSizeModal').modal('hide');
        }
    });

    // Event handler for the Font Family button
    $('#font-family').on('click', function () {
        selectedText = getSelectedTextNode();
        if (selectedText) {
            $('#fontFamilyModal').modal('show');
        } else {
            alert('Please select the text you want to change.');
        }
    });

    // Event handler for the Apply button in the Font Family modal
    $('#applyFontFamily').on('click', function () {
        const fontFamily = $('#fontFamilySelect').val();
        if (selectedText) {
            $(selectedText).css('font-family', fontFamily);
            $('#fontFamilyModal').modal('hide');
        }
    });

    // Event handler for the Font Color button
    $('#font-color').on('click', function () {
        selectedText = getSelectedTextNode();
        if (selectedText) {
            $('#fontColorModal').modal('show');
        } else {
            alert('Please select the text you want to change.');
        }
    });

    // Event handler for the Apply button in the Font Color modal
    $('#applyFontColor').on('click', function () {
        const fontColor = $('#fontColorInput').val();
        if (selectedText) {
            $(selectedText).css('color', fontColor);
            $('#fontColorModal').modal('hide');
        }
    });

});