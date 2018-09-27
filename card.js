var card = {
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                'type': 'AdaptiveCard',
                'version': '1.0',
                'body': [
                    {  
                        'type': 'Container',
                        'speak': '<s>Hi!</s><s>Bitte geben Sie ihre Auftragsnummer ein, damit wir ihnen weiter helfen können.</s>',
                        'items': [
                            {
                                'type': 'ColumnSet',
                                'columns': [
                                    {
                                        'type': 'Column',
                                        'size': 'stretch',
                                        'items': [
                                            {
                                                'type': 'TextBlock',
                                                'text': 'Auswahl',
                                                'weight': 'bolder',
                                                'isSubtle': true
                                            },
                                            {
                                                'type': 'TextBlock',
                                                'text': 'Worum geht es in eurem Anliegen?',
                                                'wrap': true
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                            'actions': [
                                {
                                    'type': 'Action.Submit',
                                    'title': 'Storno',
                                    'speak': '<s>Storno</s>',
                                    'data': {
                                        'type': 'id'
                                    }
                                },
                                {
                                    'type': 'Action.Submit',
                                    'title': 'Verschieben',
                                    'speak': '<s>Verschieben</s>',
                                    'data': {
                                        'type': 'id'
                                    }
                                },
                                {           
                                    'type': 'Action.Submit',
                                    'title': 'Foto',
                                    'speak': '<s>Foto</s>',
                                    'data': {
                                        'type': 'id'
                                    }
                                }
                            ]
                        }
                    };